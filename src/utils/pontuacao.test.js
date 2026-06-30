import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPontos } from './pontuacao.js';

const jogo = (over = {}) => ({
  time_casa: 'Brasil',
  time_fora: 'Portugal',
  placar_casa: 2,
  placar_fora: 1,
  classificado: 'Brasil',
  foi_penaltis: false,
  multiplicador: 1,
  ...over,
});

const palpite = (over = {}) => ({
  placar_casa: 2,
  placar_fora: 1,
  avanca: null,
  ...over,
});

test('placar exato com vencedor certo → (5+3) × mult', () => {
  const r = calcularPontos(palpite(), jogo());
  assert.equal(r.pontos, 8);
  assert.equal(r.placarExato, true);
  assert.equal(r.classificadoCerto, true);
});

test('placar exato × multiplicador 4 → (5+3) × 4 = 32', () => {
  const r = calcularPontos(palpite(), jogo({ multiplicador: 4 }));
  assert.equal(r.pontos, 32);
});

test('vencedor certo, placar errado → 3 × mult', () => {
  const r = calcularPontos(palpite({ placar_casa: 3, placar_fora: 0 }), jogo());
  assert.equal(r.pontos, 3);
  assert.equal(r.placarExato, false);
  assert.equal(r.classificadoCerto, true);
});

test('vencedor errado → 0', () => {
  const r = calcularPontos(palpite({ placar_casa: 0, placar_fora: 2 }), jogo());
  assert.equal(r.pontos, 0);
  assert.equal(r.classificadoCerto, false);
});

test('palpite empate + avanca certo (jogo teve vencedor) → 3 × mult', () => {
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Brasil' }), jogo());
  assert.equal(r.pontos, 3);
  assert.equal(r.classificadoCerto, true);
});

test('palpite empate + avanca errado (jogo teve vencedor) → 0', () => {
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Portugal' }), jogo());
  assert.equal(r.pontos, 0);
  assert.equal(r.classificadoCerto, false);
});

test('palpite empate acertou classificado dos pênaltis (placar errado) → 3 × mult', () => {
  const j = jogo({ placar_casa: 0, placar_fora: 0, classificado: 'Brasil', foi_penaltis: true });
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Brasil' }), j);
  assert.equal(r.pontos, 3);
  assert.equal(r.classificadoCerto, true);
});

test('placar exato em empate com pênaltis mas errou classificado → 5 × mult', () => {
  const j = jogo({ placar_casa: 0, placar_fora: 0, classificado: 'Portugal', foi_penaltis: true });
  const r = calcularPontos(palpite({ placar_casa: 0, placar_fora: 0, avanca: 'Brasil' }), j);
  assert.equal(r.pontos, 5);
  assert.equal(r.placarExato, true);
  assert.equal(r.classificadoCerto, false);
});

test('palpite empate (placar errado) errou classificado dos pênaltis → 0', () => {
  const j = jogo({ placar_casa: 0, placar_fora: 0, classificado: 'Portugal', foi_penaltis: true });
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Brasil' }), j);
  assert.equal(r.pontos, 0);
  assert.equal(r.classificadoCerto, false);
});

test('placar exato + classificado certo em empate com pênaltis → (5+3) × mult', () => {
  const j = jogo({ placar_casa: 1, placar_fora: 1, classificado: 'Brasil', foi_penaltis: true });
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Brasil' }), j);
  assert.equal(r.pontos, 8);
  assert.equal(r.placarExato, true);
  assert.equal(r.classificadoCerto, true);
});

test('multiplicador 3 (semi) em vencedor certo → 9', () => {
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 0 }), jogo({ multiplicador: 3 }));
  assert.equal(r.pontos, 9);
});

test('palpite com placar errado mas vencedor certo na prorrogação → 3', () => {
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 0 }), jogo());
  assert.equal(r.pontos, 3);
});

test('breakdown: placar exato + classificado certo', () => {
  const j = jogo({ placar_casa: 1, placar_fora: 1, classificado: 'Brasil', foi_penaltis: true });
  const r = calcularPontos(palpite({ placar_casa: 1, placar_fora: 1, avanca: 'Brasil' }), j);
  const rotulos = r.breakdown.map((b) => b.rotulo);
  assert.deepEqual(rotulos, ['Placar exato', 'Classificado certo']);
});

test('breakdown: só classificado certo (placar errado)', () => {
  const r = calcularPontos(palpite({ placar_casa: 3, placar_fora: 0 }), jogo());
  const rotulos = r.breakdown.map((b) => b.rotulo);
  assert.deepEqual(rotulos, ['Classificado certo']);
});
