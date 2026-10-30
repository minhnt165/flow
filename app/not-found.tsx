import { Compass } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Glow } from "@/components/common/glow";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/messages/vi";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <Glow className="-top-[160px] -right-[120px]" />
      <div className="relative flex max-w-sm flex-col items-center gap-5 text-center">
        <LogoMark size={48} />
        <Compass className="size-7 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.6px]">
            {t.errors.notFoundTitle}
          </h1>
          <p className="m-0 text-sm text-muted-foreground">{t.errors.notFoundBody}</p>
        </div>
        <Link href="/" className={buttonVariants({ size: "form" })}>
          {t.errors.home}
        </Link>
      </div>
    </main>
  );
}
