/**
 * Firebase 초기화 — 설정값은 .env.local (로컬) / GitHub Actions Secrets (배포)
 * VITE_FB_USE_EMULATOR=true 이면 로컬 에뮬레이터(Auth 9099 / Firestore 8080) 사용
 * Storage 미사용: Spark 요금제 유지 (2026.10.01. 결정) / 근거 파일은 근거 기록(공유폴더 경로) 방식
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FB_API_KEY,
  authDomain: env.VITE_FB_AUTH_DOMAIN,
  projectId: env.VITE_FB_PROJECT_ID,
  storageBucket: env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID,
  appId: env.VITE_FB_APP_ID,
};

const useEmulator = env.VITE_FB_USE_EMULATOR === 'true';

/** 설정 누락 항목 (화면 안내용) */
export const missingConfig: string[] = useEmulator
  ? []
  : Object.entries({
      VITE_FB_API_KEY: config.apiKey,
      VITE_FB_AUTH_DOMAIN: config.authDomain,
      VITE_FB_PROJECT_ID: config.projectId,
      VITE_FB_MESSAGING_SENDER_ID: config.messagingSenderId,
      VITE_FB_APP_ID: config.appId,
    }).filter(([, v]) => !v).map(([k]) => k);

type Services = { app: FirebaseApp; auth: Auth; db: Firestore };
let services: Services | null = null;

export function firebase(): Services {
  if (services) return services;
  if (missingConfig.length) throw new Error(`Firebase 설정 미입력 / ${missingConfig.join(', ')}`);
  const app = initializeApp(
    useEmulator
      ? { apiKey: 'demo-key', projectId: 'demo-khepi-rms', authDomain: 'localhost' }
      : config,
  );
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  services = { app, auth, db };
  return services;
}

export const isEmulator = useEmulator;
