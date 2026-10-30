import { Hourglass } from "lucide-react";
import Link from "next/link";
import { Page, PageHeader } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/messages/vi";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader title={title} />
      <div className="relative flex flex-col items-start gap-4 card p-8">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-cat-violet-bg text-cat-violet">
          <Hourglass className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-[17px] font-semibold">{t.common.soonTitle}</h2>
          <p className="m-0 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t.common.soonBody}
          </p>
        </div>
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "toolbar" })}>
          {t.common.backHome}
        </Link>
      </div>
    </Page>
  );
}
