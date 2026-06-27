import { pool } from './pool.js';

try {
  const { rows } = await pool.query('SELECT now() AS agora');
  console.log('Conexão OK:', rows[0].agora);
} catch (err) {
  console.error('Falha na conexão:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
