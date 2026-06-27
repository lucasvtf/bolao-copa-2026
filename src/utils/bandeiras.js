// Mapa de variações normalizadas → bandeira (aceita pt-BR, en, sem acento, etc).
const MAP = {
  // América do Sul
  argentina: '🇦🇷',
  bolivia: '🇧🇴',
  brasil: '🇧🇷', brazil: '🇧🇷',
  chile: '🇨🇱',
  colombia: '🇨🇴',
  equador: '🇪🇨', ecuador: '🇪🇨',
  paraguai: '🇵🇾', paraguay: '🇵🇾',
  peru: '🇵🇪',
  uruguai: '🇺🇾', uruguay: '🇺🇾',
  venezuela: '🇻🇪',
  // América do Norte e Central
  canada: '🇨🇦',
  costarica: '🇨🇷',
  cuba: '🇨🇺',
  eua: '🇺🇸', estadosunidos: '🇺🇸', usa: '🇺🇸', unitedstates: '🇺🇸', estadosunidosdaamerica: '🇺🇸',
  guatemala: '🇬🇹',
  haiti: '🇭🇹',
  honduras: '🇭🇳',
  jamaica: '🇯🇲',
  mexico: '🇲🇽',
  panama: '🇵🇦',
  // Europa
  alemanha: '🇩🇪', germany: '🇩🇪', deutschland: '🇩🇪',
  austria: '🇦🇹',
  belgica: '🇧🇪', belgium: '🇧🇪',
  croacia: '🇭🇷', croatia: '🇭🇷',
  dinamarca: '🇩🇰', denmark: '🇩🇰',
  escocia: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  eslovaquia: '🇸🇰', slovakia: '🇸🇰',
  eslovenia: '🇸🇮', slovenia: '🇸🇮',
  espanha: '🇪🇸', spain: '🇪🇸', espana: '🇪🇸',
  franca: '🇫🇷', france: '🇫🇷',
  grecia: '🇬🇷', greece: '🇬🇷',
  holanda: '🇳🇱', paisesbaixos: '🇳🇱', netherlands: '🇳🇱',
  hungria: '🇭🇺', hungary: '🇭🇺',
  inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  irlanda: '🇮🇪', ireland: '🇮🇪',
  italia: '🇮🇹', italy: '🇮🇹',
  noruega: '🇳🇴', norway: '🇳🇴',
  paisdegales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  polonia: '🇵🇱', poland: '🇵🇱',
  portugal: '🇵🇹',
  republicatcheca: '🇨🇿', tchequia: '🇨🇿', czechia: '🇨🇿',
  romenia: '🇷🇴', romania: '🇷🇴',
  russia: '🇷🇺',
  servia: '🇷🇸', serbia: '🇷🇸',
  suecia: '🇸🇪', sweden: '🇸🇪',
  suica: '🇨🇭', switzerland: '🇨🇭',
  turquia: '🇹🇷', turkey: '🇹🇷', turkiye: '🇹🇷',
  ucrania: '🇺🇦', ukraine: '🇺🇦',
  // África
  africadosul: '🇿🇦', southafrica: '🇿🇦',
  argelia: '🇩🇿', algeria: '🇩🇿',
  caboverde: '🇨🇻', capeverde: '🇨🇻',
  camaroes: '🇨🇲', cameroon: '🇨🇲',
  costadomarfim: '🇨🇮', ivorycoast: '🇨🇮', cotedivoire: '🇨🇮',
  egito: '🇪🇬', egypt: '🇪🇬',
  gana: '🇬🇭', ghana: '🇬🇭',
  marrocos: '🇲🇦', morocco: '🇲🇦',
  nigeria: '🇳🇬',
  senegal: '🇸🇳',
  tunisia: '🇹🇳',
  // Ásia e Oceania
  arabiasaudita: '🇸🇦', saudiarabia: '🇸🇦',
  australia: '🇦🇺',
  catar: '🇶🇦', qatar: '🇶🇦',
  coreiadosul: '🇰🇷', southkorea: '🇰🇷',
  ira: '🇮🇷', iran: '🇮🇷',
  japao: '🇯🇵', japan: '🇯🇵',
  jordania: '🇯🇴', jordan: '🇯🇴',
  novazelandia: '🇳🇿', newzealand: '🇳🇿',
  uzbequistao: '🇺🇿', uzbekistan: '🇺🇿',
};

const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s\-_.]/g, '');

export function bandeira(nome) {
  return MAP[normalize(nome)] ?? null;
}

export function comBandeira(nome) {
  const b = bandeira(nome);
  return b ? `${b} ${nome}` : nome;
}
