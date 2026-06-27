import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../utils/admin.js';
import { comBandeira } from '../utils/bandeiras.js';

export const data = new SlashCommandBuilder()
  .setName('admin-resultado')
  .setDescription('Registra o placar final de um jogo (admin).')
  .addIntegerOption((o) => o.setName('jogo_id').setDescription('ID do jogo').setRequired(true))
  .addIntegerOption((o) => o.setName('placar_casa').setDescription('Gols do time da casa (TN+prorrog.)').setRequired(true).setMinValue(0))
  .addIntegerOption((o) => o.setName('placar_fora').setDescription('Gols do time visitante (TN+prorrog.)').setRequired(true).setMinValue(0))
  .addBooleanOption((o) => o.setName('foi_penaltis').setDescription('Decidido nos pênaltis?'))
  .addStringOption((o) => o.setName('classificado').setDescription('Quem avançou (só obrigatório em empate)'));

export async function execute(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const id = interaction.options.getInteger('jogo_id');
  const placarCasa = interaction.options.getInteger('placar_casa');
  const placarFora = interaction.options.getInteger('placar_fora');
  const foiPenaltis = interaction.options.getBoolean('foi_penaltis') ?? false;
  const classificadoInput = interaction.options.getString('classificado')?.trim();

  const { rows: jogos } = await pool.query(
    'SELECT id, time_casa, time_fora, processado FROM jogos WHERE id = $1',
    [id],
  );
  if (jogos.length === 0) {
    return interaction.reply({ content: `Jogo #${id} não encontrado.`, ephemeral: true });
  }
  const jogo = jogos[0];

  let classificado;
  if (placarCasa > placarFora) {
    classificado = jogo.time_casa;
  } else if (placarFora > placarCasa) {
    classificado = jogo.time_fora;
  } else {
    if (!classificadoInput) {
      return interaction.reply({
        content: 'Empate: informe `classificado` (quem avançou nos pênaltis).',
        ephemeral: true,
      });
    }
    if (![jogo.time_casa, jogo.time_fora].includes(classificadoInput)) {
      return interaction.reply({
        content: `Classificado precisa ser **${comBandeira(jogo.time_casa)}** ou **${comBandeira(jogo.time_fora)}**.`,
        ephemeral: true,
      });
    }
    classificado = classificadoInput;
  }

  await pool.query(
    `UPDATE jogos
       SET placar_casa  = $1,
           placar_fora  = $2,
           classificado = $3,
           foi_penaltis = $4
     WHERE id = $5`,
    [placarCasa, placarFora, classificado, foiPenaltis, id],
  );

  const reproc = jogo.processado ? ' (jogo já estava processado — pontuação pode precisar ser recalculada)' : '';
  await interaction.reply({
    content: `Resultado do #${id} salvo: **${comBandeira(jogo.time_casa)} ${placarCasa} x ${placarFora} ${comBandeira(jogo.time_fora)}** · classificado: **${comBandeira(classificado)}**${foiPenaltis ? ' · pênaltis' : ''}.${reproc}`,
    ephemeral: true,
  });
}
