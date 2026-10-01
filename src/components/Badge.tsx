import type { ReactNode } from 'react';
import s from './ui.module.css';

export type BadgeTone =
  | 'required' | 'recommended' | 'conditional'
  | 'done' | 'late' | 'over' | 'neutral' | 'dark' | 'form';

const toneClass: Record<BadgeTone, string> = {
  required: s['b-required'],
  recommended: s['b-recommended'],
  conditional: s['b-conditional'],
  done: s['b-done'],
  late: s['b-late'],
  over: s['b-over'],
  neutral: s['b-neutral'],
  dark: s['b-dark'],
  form: s['b-form'],
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${s.badge} ${toneClass[tone]}`}>{children}</span>;
}

/** 단계 구분 배지: 필수 / 권고 / 해당 시 */
export function KindBadge({ kind }: { kind: '필수' | '권고' | '해당 시' }) {
  const tone: BadgeTone = kind === '필수' ? 'required' : kind === '권고' ? 'recommended' : 'conditional';
  return <Badge tone={tone}>{kind}</Badge>;
}
