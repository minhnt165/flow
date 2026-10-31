import { CardSkeleton } from "@/components/common/states";

// Chuyển tab con trong Chi tiêu: header giữ nguyên, phần dưới hiện khung chờ ngay thay vì đứng hình.
export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <CardSkeleton className="min-h-[188px]" />
      <CardSkeleton className="min-h-[188px]" />
      <CardSkeleton className="min-h-[188px]" />
    </div>
  );
}
