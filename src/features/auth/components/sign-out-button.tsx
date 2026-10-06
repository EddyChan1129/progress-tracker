"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOutCurrentUser } from "@/features/auth/services/auth.service";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await signOutCurrentUser();
      router.replace("/login");
    } catch {
      setErrorMessage("登出失敗，請再試一次。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Button
        disabled={isLoading}
        onClick={handleSignOut}
        type="button"
        variant="ghost"
        size="sm"
      >
        {isLoading ? "登出中…" : "登出"}
      </Button>
      {errorMessage && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
