"use client";

import { CloudOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-[14px] bg-surface-2 text-muted-foreground">
        <Icon className="size-[22px]" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-[15px] font-semibold">{title}</p>
        {body && (
          <p className="m-0 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={CloudOff}
      title={t.common.errorTitle}
      body={t.common.errorBody}
      className={className}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t.common.retry}
          </Button>
        )
      }
    />
  );
}

export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div
      className={cn("flex flex-col gap-4 card p-6", className)}
      aria-busy
      aria-label={t.common.loading}
    >
      <Skeleton className="h-3 w-28 rounded-md bg-surface-2" />
      <Skeleton className="h-10 w-48 rounded-lg bg-surface-2" />
      {Array.from({ length: lines - 2 }, (_, i) => (
        <Skeleton key={i} className="h-3 w-full rounded-md bg-surface-2" />
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-busy aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 border-b border-surface-2 py-3.5 last:border-0"
        >
          <Skeleton className="size-10 rounded-[14px] bg-surface-2" />
          <div className="flex grow flex-col gap-2">
            <Skeleton className="h-3.5 w-40 rounded-md bg-surface-2" />
            <Skeleton className="h-3 w-24 rounded-md bg-surface-2" />
          </div>
          <Skeleton className="h-4 w-20 rounded-md bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
