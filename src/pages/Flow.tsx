import { Fragment, useState } from 'react';
import s from './Flow.module.css';
import { Button, KindBadge, ui } from '../components';
import { flowFor } from '../domain/flow';
import { REGIMES, type RegimeKey } from '../domain/regimes';

const TABS: { key: RegimeKey; label: string }[] = [
  { key: 'R2025', label: '2025년도 (현행)' },
  { key: 'R2023', label: '2023년도' },
  { key: 'R2022', label: '2022년도' },
  { key: 'R2020', label: '2020년도' },
  { key: 'R2019', label: '2019년도' },
];

/** "**굵게**" 표기 → <b>, " / " → 항목 구분 */
function Rich({ text }: { text: string }) {
  const lines = text.split(' / ');
  return (
    <ul>
      {lines.map((l, i) => (
        <li key={i}>
          {l.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : <Fragment key={j}>{part}</Fragment>,
          )}
        </li>
      ))}
    </ul>
  );
}

export function Flow() {
  const [regime, setRegime] = useState<RegimeKey>('R2025');
  const groups = flowFor(regime);
  const r = REGIMES[regime];

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>진행 프로세스 안내</h1>
          <p className={s.sub}>{r.label} ({r.ruleNo}, {r.effective.replaceAll('-', '.')}. 시행) / 굵게: 기한·필수 요건</p>
        </div>
        <Button className="no-print" onClick={() => window.print()}>인쇄 (A4 가로)</Button>
      </div>

      <div className={`${ui.segment} ${s.tabs} no-print`} role="tablist">
        {TABS.map((t) => (
          <button key={t.key} aria-pressed={regime === t.key} onClick={() => setRegime(t.key)}>{t.label}</button>
        ))}
      </div>

      <table className={s.t}>
        <thead>
          <tr>
            <th>구분</th><th>세부절차</th><th>내용</th><th style={{ width: 110 }}>관련 조항</th><th style={{ width: 150 }}>서식</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) =>
            g.steps.map((st, i) => (
              <tr key={st.id}>
                {i === 0 && <td className={s.band} rowSpan={g.steps.length} style={{ background: g.color }}>{g.name}</td>}
                <td style={{ width: 190 }}>
                  <div className={s.step}>{st.name}</div>
                  <div className={s.stepSub}><KindBadge kind={st.kind} />{st.owner}</div>
                </td>
                <td className={s.content}><Rich text={st.content} /></td>
                <td className={s.center}>{st.article}</td>
                <td className={s.center}>{st.forms}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <div className={s.legend}><KindBadge kind="필수" /> 반드시 이행 <KindBadge kind="권고" /> 실시 권장 <KindBadge kind="해당 시" /> 해당 과제만</div>
    </div>
  );
}
