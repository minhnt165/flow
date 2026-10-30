import { ShieldCheck } from "lucide-react";
import { t } from "@/messages/vi";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="m-0 font-display text-[28px] font-bold tracking-[-0.6px]">{title}</h2>
      <span className="text-sm text-muted-foreground">{subtitle}</span>
    </div>
  );
}

export function AuthFooter({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3.5">
      {children}
      <span className="flex items-center gap-1.5 text-[11px] text-dim">
        <ShieldCheck className="size-3.5" aria-hidden />
        {t.auth.poweredBy}
      </span>
    </div>
  );
}
