import { SlashCommandBuilder } from 'discord.js';
import { requireAdmin } from '../utils/admin.js';
import { rodarDiario } from '../cron/diario.js';
import { rodarMatinal } from '../cron/matinal.js';
import { rodarDeadline } from '../cron/deadline.js';

const JOBS = {
  diario: rodarDiario,
  matinal: rodarMatinal,
  deadline: rodarDeadline,
};

export const data = new SlashCommandBuilder()
  .setName('admin-cron')
  .setDescription('Dispara um cron job na hora (admin).')
  .addStringOption((o) =>
    o.setName('job').setDescription('Qual job').setRequired(true).addChoices(
      { name: 'diario (resultados + ranking)', value: 'diario' },
      { name: 'matinal (jogos do dia)', value: 'matinal' },
      { name: 'deadline (avisos de fechamento)', value: 'deadline' },
    ),
  );

export async function execute(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const job = interaction.options.getString('job');
  const fn = JOBS[job];
  await interaction.deferReply({ ephemeral: true });
  try {
    await fn(interaction.client);
    await interaction.editReply(`Job **${job}** rodou. Confere o canal.`);
  } catch (err) {
    console.error('[admin-cron]', err);
    await interaction.editReply(`Falhou: ${err.message}`);
  }
}
