import Image from "next/image";

export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <Image src="/brand/logo.svg" alt="" width={38} height={38} className="shrink-0" />
      <span className={`flex min-w-0 flex-col ${inverse ? "text-white" : "text-[#173c65]"}`}>
        <span className="text-base leading-5 font-semibold tracking-tight">學習追蹤</span>
        <span className={`text-[11px] leading-4 font-medium tracking-[0.04em] ${inverse ? "text-blue-200" : "text-muted-foreground"}`}>ETracker</span>
      </span>
    </span>
  );
}
