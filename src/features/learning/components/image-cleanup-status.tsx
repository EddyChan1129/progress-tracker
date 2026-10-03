"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cleanupLearningImages } from "@/features/learning/services/learning-image.service";

export function ImageCleanupStatus() {
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    cleanupLearningImages().then((result) => {
      if (current) setPending(result.cleanupPending);
    }).catch(() => { if (current) setPending(true); });
    return () => { current = false; };
  }, []);

  async function retry() {
    setBusy(true);
    try { setPending((await cleanupLearningImages()).cleanupPending); }
    catch { setPending(true); }
    finally { setBusy(false); }
  }

  if (!pending) return null;
  return (
    <div className="space-y-2 text-sm" role="status">
      <p>記錄已保存。部分圖片仍待清理；離開後亦會保留清理進度。</p>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={retry}>
        {busy ? "清理中…" : "重試圖片清理"}
      </Button>
    </div>
  );
}
