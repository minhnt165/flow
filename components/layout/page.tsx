import { Glow } from "@/components/common/glow";
import { cn } from "@/lib/utils";

// Khung nội dung chung của mỗi trang trong app: padding, vệt sáng góc, khoảng trống cho tab dưới.
export function Page({
  children,
  className,
  glowColor,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <main
      className={cn(
        "relative flex min-w-0 flex-1 flex-col gap-6 overflow-x-clip px-[22px] pt-8 pb-32 md:gap-7 md:px-10 md:pt-8 md:pb-10",
        className,
      )}
    >
      <Glow className="-top-[160px] -right-[120px]" color={glowColor} />
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb}
        <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.6px] md:text-[30px]">
          {title}
        </h1>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
