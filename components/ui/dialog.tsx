"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const SIZES = {
  sm: "md:max-w-[440px]",
  md: "md:max-w-[560px]",
  lg: "md:max-w-[760px]",
  xl: "md:max-w-[880px]",
} as const;

// Desktop: modal giữa màn hình. Dưới 768px: chiếm toàn màn, mờ dần + trượt nhẹ 32px.
// Không trượt từ 100%: ô nhập autoFocus được focus lúc popup vẫn còn dưới màn hình, iOS Safari
// cuộn tối đa để "lộ" ô đó và sau khi mở xong chỉ thấy phần đáy, không thấy ô nhập.
function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: DialogPrimitive.Popup.Props & { size?: keyof typeof SIZES }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-overlay duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface text-text outline-none",
          "duration-200 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-8",
          "md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100dvh-48px)] md:w-[calc(100%-48px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:border md:border-border-strong md:shadow-dialog",
          "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95 md:data-closed:slide-out-to-bottom-0 md:data-closed:zoom-out-95",
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex items-center justify-between gap-4", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label={t.common.close}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-bg text-text hover:bg-surface-2 md:size-10"
      >
        <XIcon className="size-[18px]" aria-hidden />
      </DialogPrimitive.Close>
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("m-0 font-display text-[22px] font-bold tracking-[-0.4px]", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
