"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

// Chip / segmented: đang chọn = nền --text chữ --bg; còn lại trong suốt.
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  size = "md",
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-[3px] rounded-full border border-border bg-bg p-[3px]",
        size === "lg" && "gap-1 p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-10 grow cursor-pointer items-center justify-center rounded-full border-0 px-4 text-[13px] whitespace-nowrap transition-colors md:min-h-[34px]",
              size === "lg" && "min-h-9 px-[18px]",
              active
                ? "bg-text font-semibold text-bg"
                : "bg-transparent font-medium text-muted-foreground hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  ...rest
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3.5 text-xs transition-colors md:min-h-9",
        active
          ? "border-text bg-text font-semibold text-bg"
          : "border-border bg-bg font-medium text-soft hover:bg-surface-2",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
