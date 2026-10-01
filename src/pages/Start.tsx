import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/auth';
import s from './Start.module.css';
import { useToast } from '../components';

type DropProps = { target: string };

/** 엑셀 가져오기(이관·일괄 갱신) 영역 — 관리자만 표시 */
function DropZone({ target }: DropProps) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const accept = (f?: File) => f && toast(`${f.name} / ${target} 가져오기: 4단계 구현 예정`);
  return (
    <div
      className={`${s.drop} ${over ? s.over : ''}`}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]); }}
    >
      <div className={s.dropMain}>엑셀 파일 끌어 놓기<span className={s.adminOnly}>관리자 전용</span></div>
      <div>또는 클릭하여 파일 선택</div>
      <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => accept(e.target.files?.[0])} />
    </div>
  );
}

export function Start() {
  const isAdmin = useAuth().role === 'admin';
  return (
    <div className={s.wrap}>
      <h1 className={s.title}>업무 선택</h1>
      <p className={s.sub}>연구과제 관리·심의위원회 관리 / 입력·수정·조회 통합</p>

      <div className={s.grid}>
        <section className={s.card}>
          <Link to="/projects" className={`${s.head} ${s.green}`}>
            <div className={s.kicker}>RESEARCH LEDGER</div>
            <div className={s.name}>연구관리 현황</div>
            <div className={s.desc}>내부·위탁·수탁 과제 / 적용 규정·단계별 기한·이행 상태</div>
            <span className={s.go} aria-hidden>→</span>
          </Link>
          <div className={s.stats}>
            <div className={s.stat}><div className={s.statLabel}>전체 과제</div><div className={s.statNum}>7</div></div>
            <div className={s.stat}><div className={s.statLabel}>진행 중</div><div className={s.statNum}>4</div></div>
            <div className={s.stat}><div className={s.statLabel}>기한 경과</div><div className={`${s.statNum} ${s.alert}`}>1</div></div>
          </div>
          {isAdmin && <DropZone target="연구관리 현황" />}
        </section>

        <section className={s.card}>
          <Link to="/committee" className={`${s.head} ${s.orange}`}>
            <div className={s.kicker}>COMMITTEE</div>
            <div className={s.name}>심의위원회 현황</div>
            <div className={s.desc}>연구심의위원회·기관생명윤리위원회 / 위원·회의·심의결과</div>
            <span className={s.go} aria-hidden>→</span>
          </Link>
          <div className={s.stats}>
            <div className={s.stat}><div className={s.statLabel}>현 위원</div><div className={s.statNum}>8</div></div>
            <div className={s.stat}><div className={s.statLabel}>임기 만료 예정</div><div className={s.statNum}>2</div></div>
            <div className={s.stat}><div className={s.statLabel}>최근 회의</div><div className={s.statNum} style={{ fontSize: 16, paddingTop: 5 }}>2026.09.15.</div></div>
          </div>
          {isAdmin && <DropZone target="심의위원회 현황" />}
        </section>
      </div>

      <div className={s.footer}>
        <span>최신 규정 반영 <b>연구관리규정 제221호 (2026.03.03.)</b> / 기한 산정 기준 제212호</span>
        <span>마지막 수정 <b>2026.09.30. 14:20</b> 홍길동</span>
      </div>
      <div className={s.links}>
        <Link to="/regulations">규정 기준</Link>
        <Link to="/flow">진행 프로세스 안내</Link>
        {isAdmin && <Link to="/admin">관리</Link>}
      </div>
    </div>
  );
}
