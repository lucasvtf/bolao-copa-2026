import { pool } from '../db/pool.js';
import { calcularPontos } from '../utils/pontuacao.js';

export class ProcessamentoError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export async function processarJogo(jogoId, { force = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: jogos } = await client.query(
      `SELECT id, time_casa, time_fora, placar_casa, placar_fora,
              classificado, foi_penaltis, multiplicador, processado
         FROM jogos WHERE id = $1 FOR UPDATE`,
      [jogoId],
    );
    if (jogos.length === 0) {
      throw new ProcessamentoError(`Jogo #${jogoId} não encontrado.`, 'NOT_FOUND');
    }
    const jogo = jogos[0];
    if (jogo.placar_casa === null || jogo.placar_fora === null) {
      throw new ProcessamentoError('Jogo ainda não tem placar registrado.', 'NO_RESULT');
    }
    if (jogo.processado && !force) {
      throw new ProcessamentoError('Jogo já foi processado. Use force=true pra reprocessar.', 'ALREADY');
    }

    const { rows: palpites } = await client.query(
      `SELECT id, usuario_id, placar_casa, placar_fora, avanca
         FROM palpites WHERE jogo_id = $1`,
      [jogoId],
    );

    const usuariosAfetados = new Set();
    const detalhes = [];

    for (const p of palpites) {
      const r = calcularPontos(p, jogo);
      await client.query('UPDATE palpites SET pontos = $1 WHERE id = $2', [r.pontos, p.id]);
      usuariosAfetados.add(p.usuario_id);
      detalhes.push({ usuario_id: p.usuario_id, pontos: r.pontos, ...r });
    }

    if (usuariosAfetados.size > 0) {
      await client.query(
        `UPDATE usuarios u
            SET pontos_total = COALESCE((
              SELECT SUM(pontos) FROM palpites WHERE usuario_id = u.id
            ), 0)
          WHERE id = ANY($1::bigint[])`,
        [[...usuariosAfetados]],
      );
    }

    await client.query('UPDATE jogos SET processado = TRUE WHERE id = $1', [jogoId]);
    await client.query('COMMIT');

    return { jogo, processados: palpites.length, detalhes };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
