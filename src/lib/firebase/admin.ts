import "server-only";

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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
