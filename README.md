# 연구관리 통합대장

한국건강증진개발원 건강증진연구소 / 연구과제·심의위원회 관리 웹앱 (Vite + React + TypeScript)

- Firebase 프로젝트 ID·GitHub 저장소: `khepi-rms` / 배포 경로 `https://meaning6650.github.io/khepi-rms/`

## 실행
```
npm ci
npm run dev        # 개발 서버
npm run build      # 타입 검사 + 빌드 (dist/)
npm test           # domain 단위 테스트
npm run test:rules # 보안 규칙 테스트 (에뮬레이터, Java 필요)
npm run deploy:rules # Firestore 보안 규칙 배포 (Storage 미사용)
npm run emulators  # 로컬 에뮬레이터 (.env.local 에 VITE_FB_USE_EMULATOR=true)
```

## 진행 단계
- [x] 1단계 프로젝트 생성, 토큰·공통 컴포넌트, 상단바, 정적 화면 6종(더미 데이터)
- [x] 2단계 domain(regimes, stages, flow, fields) + 단위 테스트 (`npm test`)
- [x] 3단계 Firebase 연결, 로그인, 권한, 보안 규칙 (콘솔 설정: `docs/Firebase_설정_안내.md`)
- [ ] 4~9단계 이관, 데이터 연결, 근거 파일, 심의위원회, 엑셀 내보내기, 배포·설명서 (후임자용 설명서는 9단계)

## 문서
- `docs/개발지시서.md` 개발 지시서(개정 이력 포함)

## 참고 자료
- `reference/regulations/` 연구관리규정 원문(hwp) 9종 + `text/` 추출본(대조용)
- `reference/ci/` KHEPI CI / 앱 로고는 `public/ci/signature.png`
- `reference/fonts/` KoPubWorld 돋움체 원본 TTF → git 제외 / `python3 scripts/build-fonts.py` 로 `public/fonts/*.woff2` 재생성
- `reference/excel/` 개인정보 포함 원자료 → git 제외(.gitignore)
- Firebase 요금제 Spark(무료) 유지 / Storage 미사용 — 근거 파일은 공문번호·공유폴더 경로 기록 방식, `storage.rules`·`firebase.test.json` 은 보관·테스트용
