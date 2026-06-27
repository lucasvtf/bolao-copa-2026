import { pool } from './pool.js';

if (!process.argv.includes('--confirmar')) {
  console.error(
    'Recusado. Esse comando apaga jogos, palpites e usuários.\n' +
    'Pra confirmar, roda:  npm run db:reset -- --confirmar',
  );
  process.exit(1);
}

try {
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM jogos)    AS jogos,
      (SELECT COUNT(*) FROM palpites) AS palpites,
      (SELECT COUNT(*) FROM usuarios) AS usuarios
  `);
  const { jogos, palpites, usuarios } = counts.rows[0];
  console.log(`Apagando: ${jogos} jogos, ${palpites} palpites, ${usuarios} usuários...`);

  await pool.query('TRUNCATE jogos, palpites, usuarios RESTART IDENTITY CASCADE');
  console.log('Reset OK. IDs reiniciados.');
} catch (err) {
  console.error('Falha:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
