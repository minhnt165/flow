import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  /** "page" cho form trên nền trang, "dialog" cho ô nhập trong hộp thoại (nền --bg). */
  tone?: "page" | "dialog";
};

function Input({ className, type, tone = "page", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-[50px] w-full min-w-0 rounded-[14px] border border-border px-4 text-base text-text [color-scheme:dark] transition-colors outline-none placeholder:text-dim focus-visible:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger md:text-[15px]",
        tone === "dialog" ? "bg-bg" : "bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
