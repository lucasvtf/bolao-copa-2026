import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../utils/admin.js';
import { FASES, MULTIPLICADOR } from '../utils/fase.js';
import { parseKickoff, formatKickoff } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';
import { logarAcao } from '../db/audit.js';

const faseChoices = FASES.map((f) => ({ name: f, value: f }));

export const data = new SlashCommandBuilder()
  .setName('admin-jogo')
  .setDescription('Cadastra, edita ou apaga jogos do mata-mata (admin).')
  .addSubcommand((sc) =>
    sc
      .setName('add')
      .setDescription('Cadastra um novo jogo.')
      .addStringOption((o) => o.setName('fase').setDescription('Fase').setRequired(true).addChoices(...faseChoices))
      .addStringOption((o) => o.setName('time_casa').setDescription('Time da casa').setRequired(true))
      .addStringOption((o) => o.setName('time_fora').setDescription('Time visitante').setRequired(true))
      .addStringOption((o) => o.setName('kickoff').setDescription('Início (YYYY-MM-DD HH:MM em Brasília)').setRequired(true)),
  )
  .addSubcommand((sc) =>
    sc
      .setName('editar')
      .setDescription('Edita um jogo existente.')
      .addIntegerOption((o) => o.setName('jogo_id').setDescription('ID do jogo').setRequired(true))
      .addStringOption((o) => o.setName('fase').setDescription('Nova fase').addChoices(...faseChoices))
      .addStringOption((o) => o.setName('time_casa').setDescription('Novo time da casa'))
      .addStringOption((o) => o.setName('time_fora').setDescription('Novo time visitante'))
      .addStringOption((o) => o.setName('kickoff').setDescription('Novo início')),
  )
  .addSubcommand((sc) =>
    sc
      .setName('deletar')
      .setDescription('Apaga um jogo e todos os palpites associados.')
      .addIntegerOption((o) => o.setName('jogo_id').setDescription('ID do jogo').setRequired(true)),
  );

export async function execute(interaction) {
  if (!(await requireAdmin(interaction))) return;
  const sub = interaction.options.getSubcommand();
  if (sub === 'add') return addJogo(interaction);
  if (sub === 'editar') return editarJogo(interaction);
  if (sub === 'deletar') return deletarJogo(interaction);
}

async function addJogo(interaction) {
  const fase = interaction.options.getString('fase');
  const timeCasa = interaction.options.getString('time_casa').trim();
  const timeFora = interaction.options.getString('time_fora').trim();
  const kickoffStr = interaction.options.getString('kickoff');

  let kickoff;
  try {
    kickoff = parseKickoff(kickoffStr);
  } catch (err) {
    return interaction.reply({ content: err.message, ephemeral: true });
  }

  const { rows } = await pool.query(
    `INSERT INTO jogos (fase, time_casa, time_fora, kickoff, multiplicador)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [fase, timeCasa, timeFora, kickoff.toISOString(), MULTIPLICADOR[fase]],
  );

  await logarAcao(interaction, 'jogo_add', {
    jogoId: rows[0].id,
    detalhes: { fase, time_casa: timeCasa, time_fora: timeFora, kickoff: kickoff.toISOString() },
  });

  await interaction.reply({
    content: `Jogo #${rows[0].id} cadastrado: **${comBandeira(timeCasa)} x ${comBandeira(timeFora)}** (${fase}) — ${formatKickoff(kickoff)}.`,
    ephemeral: true,
  });
}

async function editarJogo(interaction) {
  const id = interaction.options.getInteger('jogo_id');
  const fase = interaction.options.getString('fase');
  const timeCasa = interaction.options.getString('time_casa');
  const timeFora = interaction.options.getString('time_fora');
  const kickoffStr = interaction.options.getString('kickoff');

  const updates = [];
  const params = [];
  let i = 1;

  if (fase) {
    updates.push(`fase = $${i++}`, `multiplicador = $${i++}`);
    params.push(fase, MULTIPLICADOR[fase]);
  }
  if (timeCasa) {
    updates.push(`time_casa = $${i++}`);
    params.push(timeCasa.trim());
  }
  if (timeFora) {
    updates.push(`time_fora = $${i++}`);
    params.push(timeFora.trim());
  }
  if (kickoffStr) {
    let kickoff;
    try {
      kickoff = parseKickoff(kickoffStr);
    } catch (err) {
      return interaction.reply({ content: err.message, ephemeral: true });
    }
    updates.push(`kickoff = $${i++}`);
    params.push(kickoff.toISOString());
  }

  if (updates.length === 0) {
    return interaction.reply({ content: 'Informe pelo menos um campo pra editar.', ephemeral: true });
  }

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE jogos SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, fase, time_casa, time_fora, kickoff`,
    params,
  );

  if (rows.length === 0) {
    return interaction.reply({ content: `Jogo #${id} não encontrado.`, ephemeral: true });
  }
  const j = rows[0];

  const mudancas = {};
  if (fase) mudancas.fase = fase;
  if (timeCasa) mudancas.time_casa = timeCasa.trim();
  if (timeFora) mudancas.time_fora = timeFora.trim();
  if (kickoffStr) mudancas.kickoff = new Date(j.kickoff).toISOString();
  await logarAcao(interaction, 'jogo_editar', { jogoId: j.id, detalhes: mudancas });

  await interaction.reply({
    content: `Jogo #${j.id} atualizado: **${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)}** (${j.fase}) — ${formatKickoff(j.kickoff)}.`,
    ephemeral: true,
  });
}

async function deletarJogo(interaction) {
  const id = interaction.options.getInteger('jogo_id');
  const { rows } = await pool.query(
    'DELETE FROM jogos WHERE id = $1 RETURNING time_casa, time_fora, fase',
    [id],
  );
  if (rows.length === 0) {
    return interaction.reply({ content: `Jogo #${id} não encontrado.`, ephemeral: true });
  }
  const j = rows[0];

  await logarAcao(interaction, 'jogo_deletar', {
    jogoId: id,
    detalhes: { fase: j.fase, time_casa: j.time_casa, time_fora: j.time_fora },
  });

  await interaction.reply({
    content: `Jogo #${id} **${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)}** (${j.fase}) deletado (e todos os palpites associados).`,
    ephemeral: true,
  });
}
