import { browserLocalPersistence, GoogleAuthProvider, setPersistence, signInWithPopup, signOut } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPopup(auth, googleProvider);
}

export function signOutCurrentUser() {
  return signOut(auth);
}

export function getCurrentUserId() {
  const userId = auth.currentUser?.uid;

  if (!userId) throw new Error("請先登入。");

  return userId;
}
