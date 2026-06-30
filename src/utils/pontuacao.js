/**
 * @param {{ placar_casa:number, placar_fora:number, avanca:string|null }} palpite
 * @param {{ placar_casa:number, placar_fora:number, classificado:string,
 *           time_casa:string, time_fora:string, multiplicador:number }} jogo
 */
export function calcularPontos(palpite, jogo) {
  const classificadoPalpite =
    palpite.placar_casa > palpite.placar_fora ? jogo.time_casa
    : palpite.placar_casa < palpite.placar_fora ? jogo.time_fora
    : palpite.avanca;

  const placarExato =
    palpite.placar_casa === jogo.placar_casa &&
    palpite.placar_fora === jogo.placar_fora;

  const classificadoCerto = classificadoPalpite === jogo.classificado;

  const breakdown = [];
  let pontosBase = 0;

  if (placarExato) {
    pontosBase += 5;
    breakdown.push({ rotulo: 'Placar exato', valor: 5 });
  }
  if (classificadoCerto) {
    pontosBase += 3;
    breakdown.push({ rotulo: 'Classificado certo', valor: 3 });
  }

  const pontos = pontosBase * jogo.multiplicador;

  return {
    pontos,
    pontosBase,
    multiplicador: jogo.multiplicador,
    placarExato,
    classificadoCerto,
    breakdown,
  };
}
