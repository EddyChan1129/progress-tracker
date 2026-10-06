"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "./button";

// Radix handles focus trapping, Escape and focus return. CSS makes the same dialog a mobile sheet.
export function ConfirmAction({
  title,
  description,
  onConfirm,
  children,
  confirmLabel = "確認刪除",
  ...buttonProps
}: {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
  confirmLabel?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const [motion, setMotion] = useState(false);
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button
          {...buttonProps}
          onPointerDown={() => setMotion(true)}
          onKeyDown={() => setMotion(false)}
        >
          {children}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="confirm-overlay" data-motion={motion} />
        <AlertDialog.Content className="confirm-content" data-motion={motion}>
          <AlertDialog.Title className="text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">取消</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  void onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
