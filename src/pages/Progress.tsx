import s from './Progress.module.css';
import { Badge, KindBadge, Table, ui, type BadgeTone } from '../components';
import { STAGES_B20253, type DummyProject, type DummyStage } from '../dummy/projects';

const TONE_COLOR: Record<DummyStage['tone'], string> = {
  done: 'var(--green)', review: 'var(--green)', late: 'var(--orange)', over: 'var(--red)', neutral: 'var(--line)',
};
const TONE_BADGE: Record<DummyStage['tone'], BadgeTone> = {
  done: 'done', review: 'done', late: 'late', over: 'over', neutral: 'neutral',
};

/** 03 진행 프로세스 탭 — 2단계에서 stages.ts 계산값으로 대체 */
export function ProgressTab({ p }: { p: DummyProject }) {
  if (p.type === 'C') {
    return <div className={`${ui.notice}`} style={{ marginTop: 16 }}>수탁연구 / 결과보고·최종보고는 발주처 계약조건 적용 (제27조) / 계약에 없는 사항은 개발원 규정 준용</div>;
  }
  const rows = STAGES_B20253;
  const done = rows.filter((r) => r.tone === 'done' || r.tone === 'review').length;
  const late = rows.filter((r) => r.tone === 'late').length;
  const over = rows.filter((r) => r.tone === 'over').length;
  const next = rows.find((r) => r.tone === 'over') ?? rows.find((r) => r.tone === 'neutral');

  return (
    <div className={s.wrap}>
      {p.id !== 'B-2025-3' && <div className={ui.notice}>예시 화면 / B-2025-3 기준 더미 데이터 표시</div>}
      <div className={s.cards}>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>완료</div><div className={`${s.sumNum} ${s.cDone}`}>{done}</div><div className={s.sumSub}>전체 {rows.length}단계</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>지연 완료</div><div className={`${s.sumNum} ${s.cLate}`}>{late}</div><div className={s.sumSub}>기한 후 이행</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>기한 경과·확인 필요</div><div className={`${s.sumNum} ${s.cOver}`}>{over}</div><div className={s.sumSub}>입력 누락 포함</div></div>
        <div className={`${ui.card} ${s.sum}`}><div className={s.sumLabel}>다음 조치</div><div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{next?.name ?? '-'}</div><div className={s.sumSub}>{next ? `기한 ${next.due} / ${next.status}` : '전 단계 완료'}</div></div>
      </div>

      <div className={`${ui.card} ${s.barCard}`}>
        <div className={s.bar}>{rows.map((r) => <span key={r.no} style={{ background: TONE_COLOR[r.tone] }} title={`${r.no}. ${r.name} / ${r.status}`} />)}</div>
        <div className={s.legend}>
          <span><i className={s.dot} style={{ background: 'var(--green)' }} />완료</span>
          <span><i className={s.dot} style={{ background: 'var(--orange)' }} />지연 완료</span>
          <span><i className={s.dot} style={{ background: 'var(--red)' }} />기한 경과</span>
          <span><i className={s.dot} style={{ background: 'var(--line)' }} />미입력·선택</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}><KindBadge kind="필수" /><KindBadge kind="권고" /><KindBadge kind="해당 시" /></span>
        </div>
      </div>

      <div className={s.ok}>평가위원 3명 / 평균 81.3점 / 적격 (제23조 제4항)</div>

      <Table
        rows={rows}
        rowKey={(r) => String(r.no)}
        columns={[
          { key: 'no', header: '번호', render: (r) => r.no, width: 56, align: 'center' },
          { key: 'name', header: '단계', width: 220, render: (r) => (
            <><div className={s.stepName}>{r.name} <KindBadge kind={r.kind} /></div><div className={s.art}>{r.article}</div></>
          ) },
          { key: 'content', header: '내용', render: (r) => (
            <div className={s.content}>
              <span>{r.content}</span>
              {r.forms !== '-' && <div className={s.forms}>{r.forms.split(', ').map((f) => <Badge key={f} tone="form">{f}</Badge>)}</div>}
              <span className={`${s.value} ${r.value ? '' : s.emptyVal}`}>입력값 {r.value || '없음'}</span>
            </div>
          ) },
          { key: 'due', header: '기한', render: (r) => r.due, width: 110, align: 'center' },
          { key: 'status', header: '이행 상태', render: (r) => <Badge tone={TONE_BADGE[r.tone]}>{r.status}</Badge>, width: 190, align: 'center' },
        ]}
      />
    </div>
  );
}
