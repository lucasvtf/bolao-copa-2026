const ISO_TZ = /[zZ]|[+-]\d{2}:?\d{2}$/;
const BR_LOCAL = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/;

export function parseKickoff(input) {
  const s = String(input).trim();
  if (ISO_TZ.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m = s.match(BR_LOCAL);
  if (m) {
    const iso = `${m[1]}T${m[2]}${m[3] ?? ':00'}-03:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error('Formato inválido. Use "YYYY-MM-DD HH:MM" (Brasília) ou ISO 8601 com fuso.');
}

const opts = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};
const FMT_BR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts });
const FMT_PT = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', ...opts });

const toDate = (d) => (d instanceof Date ? d : new Date(d));

export const formatKickoff = (date) => FMT_BR.format(toDate(date));

export const formatKickoffDuplo = (date) => {
  const d = toDate(date);
  return `${FMT_BR.format(d)} 🇧🇷 · ${FMT_PT.format(d)} 🇵🇹`;
};
