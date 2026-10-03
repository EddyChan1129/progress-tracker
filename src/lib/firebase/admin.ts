import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminAuth() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project ID is missing.");

  const app = getApps().find((app) => app.name === "learning-server")
    ?? initializeApp({ projectId }, "learning-server");
  return getAuth(app);
}

export async function getVerifiedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;

  try {
    // 驗證 Firebase 簽名、有效期及 project，唔信 client 傳入嘅 userId。
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// 寫 Firestore 需要 server credential；與只驗證 token 嘅 app 分開。
export function getAdminDb() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || (!process.env.FIRESTORE_EMULATOR_HOST && (!clientEmail || !privateKey))) {
    throw new Error("Firebase Admin credentials are missing.");
  }
  const app = getApps().find((app) => app.name === "learning-database")
    ?? initializeApp({
      projectId,
      ...(clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }) } : {}),
    }, "learning-database");
  return getFirestore(app);
}
