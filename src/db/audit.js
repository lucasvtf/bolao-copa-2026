import { pool } from './pool.js';

export async function logarAcao(interaction, acao, { jogoId = null, detalhes = null } = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (usuario_id, username, acao, jogo_id, detalhes)
       VALUES ($1, $2, $3, $4, $5)`,
      [String(interaction.user.id), interaction.user.username, acao, jogoId, detalhes],
    );
  } catch (err) {
    console.error('[audit]', err.message);
  }
}
