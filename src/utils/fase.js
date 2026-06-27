export const FASES = ['dezesseisavos', 'oitavas', 'quartas', 'semi', 'final', 'terceiro'];

export const MULTIPLICADOR = {
  dezesseisavos: 1,
  oitavas: 2,
  quartas: 3,
  semi: 4,
  final: 5,
  terceiro: 1,
};

const API_STAGE_TO_FASE = {
  LAST_32: 'dezesseisavos',
  ROUND_OF_32: 'dezesseisavos',
  LAST_16: 'oitavas',
  ROUND_OF_16: 'oitavas',
  QUARTER_FINALS: 'quartas',
  SEMI_FINALS: 'semi',
  SEMI_FINAL: 'semi',
  FINAL: 'final',
  THIRD_PLACE: 'terceiro',
  THIRD_PLACE_FINAL: 'terceiro',
};

export const apiStageToFase = (stage) => API_STAGE_TO_FASE[stage] ?? null;
