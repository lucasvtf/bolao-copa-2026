import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { calcularPontos } from '../utils/pontuacao.js';
import { comBandeira } from '../utils/bandeiras.js';

export const data = new SlashCommandBuilder()
  .setName('detalhes')
  .setDescription('Mostra o placar de um jogo e o breakdown de pontos de cada palpite.')
  .addIntegerOption((o) => o.setName('jogo_id').setDescription('ID do jogo').setRequired(true));

export async function execute(interaction) {
  const jogoId = interaction.options.getInteger('jogo_id');

  const { rows: jogos } = await pool.query(
    `SELECT id, fase, time_casa, time_fora, placar_casa, placar_fora,
            classificado, foi_penaltis, multiplicador, processado
       FROM jogos WHERE id = $1`,
    [jogoId],
  );
  if (jogos.length === 0) {
    return interaction.reply({ content: `Jogo #${jogoId} não encontrado.`, ephemeral: true });
  }
  const jogo = jogos[0];

  if (jogo.placar_casa === null) {
    return interaction.reply({
      content: `Jogo #${jogoId} ainda não tem placar lançado.`,
      ephemeral: true,
    });
  }

  const { rows: palpites } = await pool.query(
    `SELECT p.usuario_id, p.placar_casa, p.placar_fora, p.avanca
       FROM palpites p
      WHERE p.jogo_id = $1`,
    [jogoId],
  );

  const enriched = palpites
    .map((p) => ({ p, r: calcularPontos(p, jogo) }))
    .sort((a, b) => b.r.pontos - a.r.pontos);

  const titulo = `🏁 #${jogo.id} ${comBandeira(jogo.time_casa)} ${jogo.placar_casa} x ${jogo.placar_fora} ${comBandeira(jogo.time_fora)}`;

  const cabecalho = [
    `Fase: **${jogo.fase}** (×${jogo.multiplicador})`,
    `Classificado: **${comBandeira(jogo.classificado)}**${jogo.foi_penaltis ? ' · pênaltis' : ''}`,
    '',
  ];

  const linhas = enriched.length === 0
    ? ['_Ninguém palpitou nesse jogo._']
    : enriched.map(({ p, r }) => {
        const palpiteTxt = `${p.placar_casa}-${p.placar_fora}${p.avanca ? ` → ${comBandeira(p.avanca)}` : ''}`;
        const explicacao = r.breakdown.length > 0
          ? r.breakdown.map((b) => `+${b.valor} ${b.rotulo}`).join(' · ')
          : 'errou tudo';
        const total = r.pontos > 0
          ? `(× ${r.multiplicador}) = **${r.pontos} pts**`
          : '= **0 pts**';
        return `<@${p.usuario_id}> — \`${palpiteTxt}\`\n   ${explicacao} ${total}`;
      });

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription([...cabecalho, ...linhas].join('\n').slice(0, 4096))
    .setColor(0x57f287);

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
