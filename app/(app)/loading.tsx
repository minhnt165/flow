import { CardSkeleton } from "@/components/common/states";
import { Page } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page>
      <Skeleton className="h-9 w-48 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CardSkeleton className="min-h-[188px]" />
        <CardSkeleton className="min-h-[188px]" />
        <CardSkeleton className="min-h-[188px]" />
      </div>
      <CardSkeleton className="min-h-[280px]" lines={6} />
    </Page>
  );
}
