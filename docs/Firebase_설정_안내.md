# Firebase 설정 안내 (사용자 수행)

연구관리 통합대장 3단계 / 작성 2026.10.01. / 개정 2026.10.01.(Spark 요금제 유지, Storage 제외)
순서대로 진행 후 **D. 회신 항목** 전달 필요.

- 요금제: **Spark(무료) 유지** — Blaze 전환 안 함
- Storage(파일 저장소): **생성 안 함** — 근거 파일은 공문번호·공유폴더 경로를 기록하는 방식(6단계)

---

## A. Firebase 콘솔 (https://console.firebase.google.com)

### 1. 프로젝트 생성
- [프로젝트 추가] → 프로젝트 ID `khepi-rms` (확정, 완료)
- Google 애널리틱스: 사용 안 함
- 요금제: 기본 Spark 그대로 (결제 정보 등록 안 함)
- 생성 후 표시되는 **프로젝트 ID** 기록 (D 회신 항목)

### 2. Authentication (로그인)
- 빌드 → Authentication → [시작하기]
- Sign-in method → **Google** → 사용 설정 → 프로젝트 지원 이메일 선택 → 저장
- 다른 로그인 방식(이메일/비밀번호 등)은 **사용 안 함**
- 설정 → **승인된 도메인** → [도메인 추가] → `meaning6650.github.io` (9단계 배포 때)
  - `localhost` 는 기본 포함 (로컬 확인용)

### 3. Firestore Database (데이터)
- 빌드 → Firestore Database → [데이터베이스 만들기]
- 위치: **asia-northeast3 (서울)** — 생성 후 변경 불가
- 보안 규칙: **프로덕션 모드**
- Storage 메뉴는 사용하지 않음 (진입·생성 불필요)

### 4. 웹 앱 등록 (접속 정보)
- 프로젝트 개요 옆 톱니바퀴 → 프로젝트 설정 → 일반 → 내 앱 → 웹(`</>`) 아이콘
- 앱 닉네임 예: `ledger-web` / Firebase Hosting **체크 안 함**
- 표시되는 `firebaseConfig` 값 기록 (7번에 사용)
  ```
  apiKey / authDomain / projectId / messagingSenderId / appId   (storageBucket 은 선택)
  ```
- 이 값은 웹에 공개되는 식별자 (비밀번호 아님) / 접근 통제는 보안 규칙이 담당

### 5. 최초 관리자 등록 (권한 목록)
- Firestore Database → 데이터 → [컬렉션 시작]
- 컬렉션 ID: `config` → 문서 ID: `access`
- 필드 4개 추가

| 필드 | 유형 | 값 |
|---|---|---|
| `admins` | array | 본인 Google 이메일 1개 (**소문자**로 입력) |
| `editors` | array | (빈 배열) |
| `viewers` | array | (빈 배열) |
| `membersPrivateEnabled` | boolean | `false` |

- 이후 사용자 추가·권한 변경은 앱 [관리] 화면에서 처리
  - 관리자 0명 변경, 본인 관리자 권한 해제는 불가 (잠금 방지) → 다른 관리자가 처리
- `membersPrivateEnabled`: 위원 실명·생년월일 저장 허용 여부
  - **정보보안 담당 확인 전까지 false 유지** → 앱에서 실명 저장 불가 (보안 규칙으로 차단)
  - 확인 후에만 콘솔에서 true 로 변경 (앱 화면에서는 변경 불가)

---

## B. 내 PC (로컬 실행)

### 6. 준비
- Node.js 22 LTS 설치 (https://nodejs.org)
- 저장소 내려받기 → 폴더에서 `npm ci`

### 7. 접속 정보 파일
- `.env.example` 을 복사해 `.env.local` 생성 → 4번 값 입력
  ```
  VITE_FB_API_KEY=...
  VITE_FB_AUTH_DOMAIN=...
  VITE_FB_PROJECT_ID=...
  VITE_FB_MESSAGING_SENDER_ID=...
  VITE_FB_APP_ID=...
  ```
- `VITE_FB_STORAGE_BUCKET` 은 비워 두어도 됨
- `.env.local` 은 git 제외 대상 (저장소에 올라가지 않음)

### 8. 보안 규칙 배포 (Firestore 만)
- firebase-tools 는 프로젝트에 포함되어 있어 전역 설치 불필요
  ```
  npx firebase login
  # .firebaserc 에 khepi-rms 지정되어 있어 firebase use 단계 생략 가능
  npm run deploy:rules          # = firebase deploy --only firestore:rules
  ```
- 배포 완료 메시지 확인 (`Deploy complete!`)
- Storage 규칙(storage.rules)은 보관용 / 배포 대상 아님

### 9. 로그인 확인
- `npm run dev` → 브라우저에서 표시 주소 접속 (예: http://localhost:5173/khepi-rms/)
- [Google 계정으로 로그인] → 5번에 등록한 계정으로 로그인
- 정상: 상단바에 이름과 "관리자" 표시 / [관리] 화면 진입 가능
- 다른(미등록) 계정 로그인 시 "접근 권한 없음" 표시 확인

---

## C. GitHub (9단계 배포 때 진행, 미리 해도 무방)
- Settings → Secrets and variables → Actions → 7번 값을 같은 이름으로 등록
- Settings → Pages → Source: **GitHub Actions**
- 저장소 비공개 권장

---

## D. 회신 항목
1. 프로젝트 ID
2. 8번 규칙 배포 결과 (성공 / 오류 메시지)
3. 9번 로그인 확인 결과 (관리자 표시 여부, 미등록 계정 차단 여부)
4. 정보보안 담당 확인 일정 (위원 실명·생년월일, 비공개 과제 원문)

---

## 참고: 개발자 확인용 (콘솔 작업 불필요)
- `npm test` — domain 단위 테스트
- `npm run test:rules` — 보안 규칙 테스트 (Java 11 이상 필요, Storage 보관 규칙 포함, 결과표: `docs/보안규칙_테스트결과.md`)
- `npm run emulators` + `.env.local` 에 `VITE_FB_USE_EMULATOR=true` — 실제 프로젝트 없이 로컬 에뮬레이터로 실행
