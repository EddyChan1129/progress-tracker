import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutCurrentUser() {
  return signOut(auth);
}
