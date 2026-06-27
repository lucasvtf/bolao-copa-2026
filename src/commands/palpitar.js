import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { upsertUsuario } from '../db/usuarios.js';
import { formatKickoffDuplo } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';

const DEADLINE_HORAS = 1;
const PLACAR_RE = /^(\d{1,2})\s*[-xX:]\s*(\d{1,2})$/;
const INDEFINIDO_RE = /^(TBD|[1-3]º\s)/i;
const timeIndefinido = (nome) => INDEFINIDO_RE.test(String(nome).trim());
const temTimeIndefinido = (jogo) => timeIndefinido(jogo.time_casa) || timeIndefinido(jogo.time_fora);

export const data = new SlashCommandBuilder()
  .setName('palpitar')
  .setDescription('Registra ou atualiza seu palpite num jogo do mata-mata.')
  .addIntegerOption((o) =>
    o.setName('jogo').setDescription('Jogo (digita pra buscar)').setRequired(true).setAutocomplete(true),
  )
  .addStringOption((o) =>
    o.setName('placar').setDescription('Placar do tempo normal + prorrogação. Ex: 2-1').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('avanca').setDescription('Quem avança (obrigatório em caso de empate)'),
  );

export async function autocomplete(interaction) {
  const focused = (interaction.options.getFocused() ?? '').trim();
  const semFiltro = focused === '';
  const filtro = `%${focused}%`;

  const { rows } = await pool.query(
    `SELECT j.id, j.fase, j.time_casa, j.time_fora, j.kickoff,
            EXISTS (SELECT 1 FROM palpites p WHERE p.jogo_id = j.id AND p.usuario_id = $1) AS palpitou
       FROM jogos j
      WHERE j.placar_casa IS NULL
        AND j.kickoff > now() + ($2 || ' hours')::interval
        AND ($3 OR j.time_casa ILIKE $4 OR j.time_fora ILIKE $4 OR CAST(j.id AS TEXT) ILIKE $4)
        AND (
          NOT $3
          OR NOT EXISTS (SELECT 1 FROM palpites p WHERE p.jogo_id = j.id AND p.usuario_id = $1)
        )
      ORDER BY j.kickoff
      LIMIT 25`,
    [String(interaction.user.id), String(DEADLINE_HORAS), semFiltro, filtro],
  );

  const choices = rows.map((j) => ({
    name: `${j.palpitou ? '✅ ' : ''}#${j.id} ${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)} (${formatKickoffDuplo(j.kickoff)})`.slice(0, 100),
    value: j.id,
  }));
  await interaction.respond(choices);
}

export async function execute(interaction) {
  const jogoId = interaction.options.getInteger('jogo');
  const placarStr = interaction.options.getString('placar');
  const avancaInput = interaction.options.getString('avanca')?.trim();

  const m = placarStr.trim().match(PLACAR_RE);
  if (!m) {
    return interaction.reply({ content: 'Placar inválido. Usa o formato `2-1`.', ephemeral: true });
  }
  const placarCasa = Number(m[1]);
  const placarFora = Number(m[2]);

  const jogo = await buscarJogo(jogoId);
  if (!jogo) {
    return interaction.reply({ content: `Jogo #${jogoId} não encontrado.`, ephemeral: true });
  }
  if (jogo.placar_casa !== null) {
    return interaction.reply({ content: 'Esse jogo já tem resultado registrado.', ephemeral: true });
  }
  if (temTimeIndefinido(jogo)) {
    return interaction.reply({
      content: 'Os times deste jogo ainda não foram definidos. Aguarda o fim dos grupos pra palpitar.',
      ephemeral: true,
    });
  }
  if (deadlinePassou(jogo)) {
    return interaction.reply({
      content: `Deadline já passou. Palpites fecham ${DEADLINE_HORAS}h antes do kick-off (${formatKickoffDuplo(jogo.kickoff)}).`,
      ephemeral: true,
    });
  }

  if (placarCasa === placarFora) {
    if (avancaInput) {
      if (![jogo.time_casa, jogo.time_fora].includes(avancaInput)) {
        return interaction.reply({
          content: `\`avanca\` precisa ser **${comBandeira(jogo.time_casa)}** ou **${comBandeira(jogo.time_fora)}**.`,
          ephemeral: true,
        });
      }
      return responderPalpite(interaction, jogo, placarCasa, placarFora, avancaInput);
    }
    return pedirAvanca(interaction, jogo, placarCasa, placarFora);
  }

  return responderPalpite(interaction, jogo, placarCasa, placarFora, null);
}

export async function handleComponent(interaction) {
  if (!interaction.isButton()) return;
  const [, kind, jogoIdStr, casaStr, foraStr, idxStr] = interaction.customId.split(':');
  if (kind !== 'empate') return;

  const jogoId = Number(jogoIdStr);
  const placarCasa = Number(casaStr);
  const placarFora = Number(foraStr);
  const idx = Number(idxStr);

  const jogo = await buscarJogo(jogoId);
  if (!jogo) {
    return interaction.update({ content: 'Jogo não encontrado.', components: [] });
  }
  if (jogo.placar_casa !== null) {
    return interaction.update({ content: 'Esse jogo já tem resultado registrado.', components: [] });
  }
  if (deadlinePassou(jogo)) {
    return interaction.update({
      content: `Deadline já passou (${formatKickoffDuplo(jogo.kickoff)}).`,
      components: [],
    });
  }

  const avanca = idx === 0 ? jogo.time_casa : jogo.time_fora;
  return responderPalpite(interaction, jogo, placarCasa, placarFora, avanca, { update: true });
}

async function buscarJogo(id) {
  const { rows } = await pool.query(
    'SELECT id, fase, time_casa, time_fora, kickoff, placar_casa FROM jogos WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

function deadlinePassou(jogo) {
  const deadline = new Date(new Date(jogo.kickoff).getTime() - DEADLINE_HORAS * 3600 * 1000);
  return new Date() >= deadline;
}

async function pedirAvanca(interaction, jogo, placarCasa, placarFora) {
  const base = `palpitar:empate:${jogo.id}:${placarCasa}:${placarFora}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${base}:0`).setLabel(jogo.time_casa).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${base}:1`).setLabel(jogo.time_fora).setStyle(ButtonStyle.Primary),
  );
  return interaction.reply({
    content: `Empate (${placarCasa}-${placarFora}) em **${comBandeira(jogo.time_casa)} x ${comBandeira(jogo.time_fora)}**. Quem avança?`,
    components: [row],
    ephemeral: true,
  });
}

async function responderPalpite(interaction, jogo, placarCasa, placarFora, avanca, { update = false } = {}) {
  await upsertUsuario(interaction.user.id, interaction.user.username);

  const { rows } = await pool.query(
    `INSERT INTO palpites (usuario_id, jogo_id, placar_casa, placar_fora, avanca)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, jogo_id) DO UPDATE
       SET placar_casa = EXCLUDED.placar_casa,
           placar_fora = EXCLUDED.placar_fora,
           avanca      = EXCLUDED.avanca,
           updated_at  = now()
     RETURNING (xmax = 0) AS inserido`,
    [String(interaction.user.id), jogo.id, placarCasa, placarFora, avanca],
  );

  const verbo = rows[0].inserido ? 'registrado' : 'atualizado';
  const extra = avanca ? ` · avança: **${comBandeira(avanca)}**` : '';
  const payload = {
    content: `Palpite ${verbo} no #${jogo.id} **${comBandeira(jogo.time_casa)} x ${comBandeira(jogo.time_fora)}** (${jogo.fase}): **${placarCasa}-${placarFora}**${extra}.`,
    components: [],
  };
  if (update) return interaction.update(payload);
  return interaction.reply({ ...payload, ephemeral: true });
}
