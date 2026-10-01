import s from './Regulations.module.css';
import { Badge, ui } from '../components';
import { COMPARE_ROWS, REGIMES, REVISIONS, type RegimeKey } from '../domain/regimes';

const COLS: RegimeKey[] = ['R2019', 'R2020', 'R2022', 'R2023', 'R2025'];

const DECISION = [
  { step: '판별 1', cond: '2025.8.11. 이후 종료', basis: '연구종료일', res: '2025년도 규정', no: '제212호', cur: true },
  { step: '판별 2', cond: '2023.5.12. 이후 심의 승인', basis: '심의 승인일', res: '2023년도 규정', no: '제174호' },
  { step: '판별 3', cond: '2022.7.15. 이후 심의 승인', basis: '심의 승인일', res: '2022년도 규정', no: '제153호' },
  { step: '판별 4', cond: '그 이전', basis: '연구시작일(협약일)', res: '2020년도 / 2019년도 규정', no: '제107호 / 제77호' },
];

export function Regulations() {
  return (
    <div className={s.wrap}>
      <div>
        <h1 className={s.h1}>규정 기준</h1>
        <p className={s.sub}>연구관리규정 원문 대조 / 기한·절차가 달라지는 구간 5개 / 수탁연구는 판별 제외(제27조, 발주처 계약조건)</p>
      </div>

      <section>
        <h2 className={s.h2}>적용 규정 판별</h2>
        <div className={s.cards}>
          {DECISION.map((d) => (
            <div key={d.step} className={`${ui.card} ${s.rc} ${d.cur ? s.cur : ''}`}>
              <span className={s.step}>{d.step}</span>
              <span className={s.cond}>{d.cond}</span>
              <span className={s.res}>→ <b>{d.res}</b> ({d.no})</span>
              <span className={s.res} style={{ color: 'var(--muted)' }}>기준: {d.basis}</span>
            </div>
          ))}
        </div>
        <p className={s.hint}>수동 지정값 우선 / 심의X 과제는 심의 승인일 무시 / 연구기간·심의 승인일 모두 없으면 판별 불가(연구기간 입력 필요)</p>
      </section>

      <section>
        <h2 className={s.h2}>구간별 비교</h2>
        <div className={s.cmpWrap}>
          <table className={s.cmp}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>구분</th>
                {COLS.map((k) => (
                  <th key={k} className={k === 'R2025' ? s.now : ''}>
                    {REGIMES[k].label}{k === 'R2025' && ' (현행)'}
                    <small>{REGIMES[k].ruleNo} / {REGIMES[k].effective.replaceAll('-', '.')}.</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.item}>
                  <td className={s.item}>{row.item}</td>
                  {COLS.map((k, i) => {
                    const changed = i > 0 && stripRef(row[k]) !== stripRef(row[COLS[i - 1]]);
                    return <td key={k} className={[changed && s.changed, k === 'R2025' && s.nowCol].filter(Boolean).join(' ')}>{row[k]}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.hint}><i className={s.sw} /> 직전 구간 대비 변경</p>
      </section>

      <section>
        <h2 className={s.h2}>개정 이력</h2>
        <div className={`${ui.card}`} style={{ padding: '12px 8px 16px' }}>
          <div className={s.tl}>
            {REVISIONS.map((r) => (
              <div key={r.date} className={s.node}>
                <span className={`${s.pin} ${r.changesDeadline ? s.major : ''}`} />
                <span className={s.tDate}>{r.date}</span>
                <span className={s.tTitle}>{r.title}</span>
                {r.changesDeadline ? <Badge tone="done">기한 변경</Badge> : <Badge tone="neutral">기한 변경 없음</Badge>}
                {r.memo && <span className={s.tMemo}>{r.memo}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** 조항·서식 번호만 다른 칸은 변경으로 보지 않음 (서식 범위 "서식1~N호" 는 비교 유지) */
function stripRef(v: string) {
  return v.replace(/제\d+조/g, '제N조').replace(/서식\d+호/g, '서식N호');
}
