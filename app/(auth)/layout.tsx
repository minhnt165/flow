import { Glow } from "@/components/common/glow";
import { ProgressRing } from "@/components/common/progress-ring";
import { Logo } from "@/components/brand/logo";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { t } from "@/messages/vi";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg md:flex-row">
      <section className="relative flex flex-col justify-between gap-12 overflow-hidden border-surface-2 bg-surface px-6 py-8 pt-[max(32px,calc(env(safe-area-inset-top)+16px))] md:min-h-dvh md:flex-1 md:border-r md:px-12 md:py-10">
        <Glow className="-bottom-[200px] -left-[160px]" size={560} color="rgb(212 240 74 / 0.18)" />
        <Logo size={36} className="relative [&>span:last-child]:text-xl" />

        <div className="relative hidden max-w-[460px] flex-col gap-7 md:flex">
          <h1 className="m-0 font-display text-[44px] leading-[1.08] font-bold tracking-[-1.5px] text-pretty">
            {t.auth.heroTitle}
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-pretty text-muted-foreground">
            {t.auth.heroBody}
          </p>
          <div className="flex max-w-[380px] items-center gap-[18px] rounded-[20px] border border-border bg-bg px-5 py-[18px]">
            <ProgressRing value={73} size={72} stroke={7}>
              <span className="font-display text-[22px] font-bold tracking-[-1px]">99</span>
            </ProgressRing>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-semibold">{t.auth.heroCardTitle}</span>
              <span className="text-[13px] text-muted-foreground">{t.auth.heroCardBody}</span>
            </div>
          </div>
        </div>

        <span className="relative hidden text-xs text-dim md:block">{t.app.copyright}</span>
      </section>

      <main className="flex flex-1 items-start justify-center px-6 py-10 md:items-center md:px-10 md:py-12">
        <div className="flex w-full max-w-[400px] flex-col gap-7">
          {!hasSupabaseEnv && (
            <p
              role="alert"
              className="rounded-[14px] border border-cat-orange/30 bg-cat-orange-bg px-4 py-3 text-sm text-cat-orange"
            >
              {t.app.missingEnv}
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
