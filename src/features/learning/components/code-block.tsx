"use client";

import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import { Button } from "@/components/ui/button";

for (const [name, language] of Object.entries({
  javascript,
  typescript,
  python,
  json,
  css,
  xml,
  sql,
  bash,
})) {
  hljs.registerLanguage(name, language);
}

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [status, setStatus] = useState("");
  const highlighted = useMemo(
    () =>
      language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : null,
    [code, language],
  );
  return (
    <div className="code-block min-w-0 overflow-hidden rounded-md border bg-muted/50">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1">
        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {language || "Code"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="複製程式碼"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setStatus("已複製");
            } catch {
              setStatus("複製失敗，請選取程式碼複製");
            }
          }}
        >
          複製 code
        </Button>
      </div>
      <pre
        className="!m-0 max-w-full overflow-x-auto !rounded-none !bg-transparent !p-3 font-mono text-sm leading-6 whitespace-pre"
        tabIndex={0}
        aria-label="程式碼"
      >
        {highlighted === null ? (
          <code>{code}</code>
        ) : (
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        )}
      </pre>
      <span
        role="status"
        className={
          status ? "block px-3 pb-2 text-xs text-muted-foreground" : "sr-only"
        }
      >
        {status}
      </span>
    </div>
  );
}
