import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { formatKickoffDuplo } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';
import { calcularPontos } from '../utils/pontuacao.js';

const LIMIT = 40;

export const data = new SlashCommandBuilder()
  .setName('meus-palpites')
  .setDescription('Lista os seus palpites com status e pontos.');

export async function execute(interaction) {
  const { rows } = await pool.query(
    `SELECT j.id            AS jogo_id,
            j.fase,
            j.time_casa,
            j.time_fora,
            j.kickoff,
            j.multiplicador,
            j.placar_casa   AS placar_real_casa,
            j.placar_fora   AS placar_real_fora,
            j.classificado,
            j.processado,
            p.placar_casa   AS palpite_casa,
            p.placar_fora   AS palpite_fora,
            p.avanca,
            p.pontos
       FROM palpites p
       JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = $1
      ORDER BY j.kickoff ASC
      LIMIT $2`,
    [String(interaction.user.id), LIMIT],
  );

  if (rows.length === 0) {
    return interaction.reply({ content: 'Você ainda não palpitou em nenhum jogo.', ephemeral: true });
  }

  const linhas = rows.map((r) => {
    const palpite = `${r.palpite_casa}-${r.palpite_fora}${r.avanca ? ` (→ ${comBandeira(r.avanca)})` : ''}`;
    let status;
    let explicacao = null;

    if (r.processado) {
      const real = `${r.placar_real_casa}-${r.placar_real_fora}${r.classificado ? ` (→ ${comBandeira(r.classificado)})` : ''}`;
      status = `resultado **${real}** · **${r.pontos ?? 0} pts**`;
      const detalhes = calcularPontos(
        { placar_casa: r.palpite_casa, placar_fora: r.palpite_fora, avanca: r.avanca },
        {
          time_casa: r.time_casa,
          time_fora: r.time_fora,
          placar_casa: r.placar_real_casa,
          placar_fora: r.placar_real_fora,
          classificado: r.classificado,
          multiplicador: r.multiplicador,
        },
      );
      explicacao = detalhes.breakdown.length > 0
        ? `${detalhes.breakdown.map((b) => `+${b.valor} ${b.rotulo}`).join(' · ')} (× ${detalhes.multiplicador})`
        : 'errou tudo';
    } else if (r.placar_real_casa !== null) {
      status = `resultado **${r.placar_real_casa}-${r.placar_real_fora}** · _aguardando processamento_`;
    } else {
      status = `_${formatKickoffDuplo(r.kickoff)}_`;
    }

    const base = `**#${r.jogo_id}** ${comBandeira(r.time_casa)} x ${comBandeira(r.time_fora)} · _${r.fase}_\n→ palpite: \`${palpite}\` · ${status}`;
    return explicacao ? `${base}\n   ${explicacao}` : base;
  });

  const MAX_DESC = 3800;
  const porFase = new Map();
  for (let i = 0; i < rows.length; i++) {
    const fase = rows[i].fase;
    if (!porFase.has(fase)) porFase.set(fase, []);
    porFase.get(fase).push(linhas[i]);
  }

  const embeds = [];
  for (const [fase, linhasFase] of porFase) {
    let pontosFase = 0;
    for (const r of rows) if (r.fase === fase) pontosFase += r.pontos ?? 0;

    let atual = '';
    let parte = 1;
    const totalPartes = (() => {
      let p = 1;
      let s = '';
      for (const l of linhasFase) {
        const prox = (s ? '\n\n' : '') + l;
        if (s.length + prox.length > MAX_DESC) { p++; s = l; } else { s += prox; }
      }
      return p;
    })();

    const flushar = () => {
      const titulo = totalPartes > 1
        ? `${fase} (${pontosFase} pts) — parte ${parte}/${totalPartes}`
        : `${fase} (${pontosFase} pts)`;
      embeds.push(new EmbedBuilder().setTitle(titulo).setDescription(atual).setColor(0x5865f2));
      atual = '';
      parte++;
    };

    for (const linha of linhasFase) {
      const proxima = (atual ? '\n\n' : '') + linha;
      if (atual.length + proxima.length > MAX_DESC) {
        flushar();
        atual = linha;
      } else {
        atual += proxima;
      }
    }
    if (atual) flushar();
  }

  const total = rows.reduce((s, r) => s + (r.pontos ?? 0), 0);
  embeds[0].setAuthor({ name: `Palpites de ${interaction.user.username} — ${total} pts totais` });

  await interaction.reply({ embeds: [embeds[0]], ephemeral: true });
  for (let i = 1; i < embeds.length; i++) {
    await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
  }
}
