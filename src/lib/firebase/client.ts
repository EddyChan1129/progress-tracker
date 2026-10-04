import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable: ${name}`);

  return value;
}

const firebaseConfig = {
  apiKey: requireEnv(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: requireEnv(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: requireEnv(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  appId: requireEnv(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
};

const isNewApp = getApps().length === 0;
const firebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// 只喺明確指定嘅本機開發環境使用 emulator；production 永遠唔接駁測試資料。
if (isNewApp && typeof window !== "undefined" && process.env.NODE_ENV === "development"
  && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
