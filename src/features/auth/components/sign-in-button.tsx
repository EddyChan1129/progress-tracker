"use client";

import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/features/auth/services/auth.service";

function getErrorMessage(error: unknown) {
  if (
    error instanceof FirebaseError &&
    error.code === "auth/popup-closed-by-user"
  ) {
    return "登入已取消，你可以再試一次。";
  }

  return "Google 登入失敗，請再試一次。";
}

export function SignInButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignIn() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <Button disabled={isLoading} onClick={handleSignIn} type="button">
        {isLoading ? "登入中…" : "使用 Google 登入"}
      </Button>
      {errorMessage && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
