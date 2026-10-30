"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

// Công tắc 46×28: bật = nền accent núm --bg; tắt = nền #2C2F3A núm --dim.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-7 w-[46px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-accent data-unchecked:bg-switch-off data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[22px] rounded-full transition-transform data-checked:translate-x-[18px] data-checked:bg-bg data-unchecked:translate-x-0 data-unchecked:bg-dim"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
