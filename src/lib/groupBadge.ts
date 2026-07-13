/** Estilos por letra de grupo (A, B, C…) para badges de origen/destino. */
const GROUP_LETTER_STYLES: Record<string, string> = {
  A: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  B: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  C: 'bg-violet-500/15 text-violet-300 border-violet-500/35',
  D: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  E: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
  F: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
};

const LIGA_STYLE = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35';

export function extractGroupLetter(groupName: string | null | undefined): string | null {
  if (!groupName) return null;
  const match = groupName.match(/Grupo\s+([A-Z])/i);
  if (match) return match[1].toUpperCase();
  if (/liga/i.test(groupName)) return null;
  return groupName.trim().charAt(0).toUpperCase() || null;
}

export function groupBadgeStyle(groupName: string | null | undefined): string {
  if (!groupName) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  if (/liga/i.test(groupName)) return LIGA_STYLE;
  const letter = extractGroupLetter(groupName);
  if (letter && GROUP_LETTER_STYLES[letter]) return GROUP_LETTER_STYLES[letter];
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

export function shortGroupLabel(groupName: string | null | undefined): string {
  if (!groupName) return '?';
  const letter = extractGroupLetter(groupName);
  if (letter) return `Grupo ${letter}`;
  return groupName.length > 14 ? `${groupName.slice(0, 12)}…` : groupName;
}
