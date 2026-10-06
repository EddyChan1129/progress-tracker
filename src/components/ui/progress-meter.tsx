import { cn } from "@/lib/utils";

export function ProgressMeter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <progress
      className={cn("progress-meter", className)}
      aria-label={label}
      max={100}
      value={percent}
    >
      {Math.round(percent)}%
    </progress>
  );
}
