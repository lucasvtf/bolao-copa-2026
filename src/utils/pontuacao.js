/**
 * @param {{ placar_casa:number, placar_fora:number, avanca:string|null }} palpite
 * @param {{ placar_casa:number, placar_fora:number, classificado:string,
 *           foi_penaltis:boolean, time_casa:string, time_fora:string,
 *           multiplicador:number }} jogo
 */
export function calcularPontos(palpite, jogo) {
  const palpiteEmpate = palpite.placar_casa === palpite.placar_fora;

  const classificadoPalpite =
    palpite.placar_casa > palpite.placar_fora ? jogo.time_casa
    : palpite.placar_casa < palpite.placar_fora ? jogo.time_fora
    : jogo.foi_penaltis ? palpite.avanca
    : null;

  const placarExato =
    palpite.placar_casa === jogo.placar_casa &&
    palpite.placar_fora === jogo.placar_fora;

  const classificadoCerto = classificadoPalpite === jogo.classificado;
  const previuPenaltis = palpiteEmpate && jogo.foi_penaltis === true;

  const breakdown = [];
  let pontosBase = 0;

  if (placarExato) {
    pontosBase = 5;
    breakdown.push({ rotulo: 'Placar exato', valor: 5 });
  } else if (classificadoCerto) {
    pontosBase = 3;
    breakdown.push({ rotulo: 'Classificado certo', valor: 3 });
  }
  if (previuPenaltis) {
    pontosBase += 1;
    breakdown.push({ rotulo: 'Previu pênaltis', valor: 1 });
  }

  const pontos = pontosBase * jogo.multiplicador;

  return {
    pontos,
    pontosBase,
    multiplicador: jogo.multiplicador,
    placarExato,
    classificadoCerto,
    previuPenaltis,
    breakdown,
  };
}
