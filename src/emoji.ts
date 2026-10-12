import type { LearnedPhrase, Segment } from './types.js';

type Emotion = { name: string; emoji: string; patterns: RegExp[] };

const emotions: Emotion[] = [
  { name: 'happy', emoji: '😊', patterns: [/\bxursand\w*/u, /\bhursand\w*/u, /\bquvon\w*/u, /\bmamnun\w*/u, /\byaxshi boshland\w*/u] },
  { name: 'sad', emoji: '😔', patterns: [/\bxafa\w*/u, /\bhafa\w*/u, /\byig'la\w*/u, /\bafsus\w*/u, /\btushkun\w*/u] },
  { name: 'shy', emoji: '🫣', patterns: [/\buyal\w*/u, /\bhijolat\w*/u, /\bduv qizar\w*/u] },
  { name: 'excited', emoji: '🥹', patterns: [/\bhayajon\w*/u, /\bto'lqinlan\w*/u, /\bintizor\w*/u] },
  { name: 'worried', emoji: '😟', patterns: [/\bxavotir\w*/u, /\bqo'rq\w*/u, /\btashvish\w*/u] },
  { name: 'tired', emoji: '😴', patterns: [/\buyqum kelmad\w*/u, /\buxlay olmad\w*/u, /\bcharchad\w*/u, /\bqiynald\w*/u] },
  { name: 'calm', emoji: '😌', patterns: [/\bxotirjam\w*/u, /\byengil tort\w*/u] }
];

export const emojiChoices = [
  { code: 'happy', label: 'Xursand 😊', emoji: '😊' },
  { code: 'sad', label: 'Xafa 😔', emoji: '😔' },
  { code: 'shy', label: 'Uyalgan 🫣', emoji: '🫣' },
  { code: 'excited', label: 'Hayajon 🥹', emoji: '🥹' },
  { code: 'worried', label: 'Xavotir 😟', emoji: '😟' },
  { code: 'tired', label: 'Charchoq 😴', emoji: '😴' },
  { code: 'calm', label: 'Xotirjam 😌', emoji: '😌' },
  { code: 'skip', label: 'Emoji kerak emas', emoji: '' }
] as const;

function normalize(text: string): string {
  return text.toLocaleLowerCase('uz').replace(/[ʻ’‘`]/gu, "'");
}

function isNegated(text: string, end: number): boolean {
  return /^\s*(emas\w*|yo'q\w*|yoq\w*)\b/u.test(text.slice(end, end + 18));
}

export function suggestEmoji(body: string, learned: LearnedPhrase[]): { emoji: string; source: 'learned' | 'rule' } | null {
  const text = normalize(body);
  const matchingLearned = learned
    .filter((item) => text.includes(normalize(item.phrase)))
    .sort((a, b) => b.phrase.length - a.phrase.length);
  if (matchingLearned.length > 0) {
    const longest = matchingLearned[0]!;
    if (matchingLearned.some((item) => item.phrase.length === longest.phrase.length && item.emoji !== longest.emoji)) return null;
    return { emoji: longest.emoji, source: 'learned' };
  }

  const matches = emotions.filter((emotion) => emotion.patterns.some((pattern) => {
    const match = pattern.exec(text);
    return match && !isNegated(text, match.index + match[0].length);
  }));
  return matches.length === 1 ? { emoji: matches[0]!.emoji, source: 'rule' } : null;
}

export function splitSegments(text: string, learned: LearnedPhrase[]): Segment[] {
  const parts = text.split(/([.!?;,\n]+)/u);
  const segments: Segment[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i] ?? '';
    const suggestion = body.trim() ? suggestEmoji(body, learned) : null;
    segments.push({ body, separator: parts[i + 1] ?? '', emoji: suggestion?.emoji ?? null, source: suggestion?.source ?? null });
  }
  return segments;
}

export function nextQuestionIndex(segments: Segment[]): number | null {
  const index = segments.findIndex((segment) => segment.body.trim() && segment.emoji === null);
  return index < 0 ? null : index;
}

export function renderSegments(segments: Segment[]): string {
  return segments.map((segment) => {
    if (!segment.emoji) return segment.body + segment.separator;
    const trailing = segment.body.match(/\s*$/u)?.[0] ?? '';
    const main = segment.body.slice(0, segment.body.length - trailing.length);
    return `${main} ${segment.emoji}${trailing}${segment.separator}`;
  }).join('');
}

export function validSingleEmoji(value: string): boolean {
  const chars = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value.trim())];
  return chars.length === 1 && /\p{Extended_Pictographic}/u.test(chars[0]?.segment ?? '');
}

export function learnPhrase(learned: LearnedPhrase[], phrase: string, emoji: string): LearnedPhrase[] {
  const key = normalize(phrase.trim());
  if (!key || key.length > 160) return learned;
  const rest = learned.filter((item) => normalize(item.phrase) !== key);
  return [{ phrase: phrase.trim(), emoji, updatedAt: new Date() }, ...rest].slice(0, 200);
}
