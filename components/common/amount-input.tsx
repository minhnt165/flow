"use client";

import { useState } from "react";
import { formatAmountInput, parseAmountInput } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
  "aria-label"?: string;
};

// Ô nhập tiền: tự thêm dấu chấm nghìn khi gõ, giữ giá trị là số nguyên.
export function AmountInput({
  id,
  name,
  value,
  onChange,
  placeholder = "0",
  className,
  inputClassName,
  suffix = "₫",
  autoFocus,
  ...rest
}: Props) {
  const [text, setText] = useState(value ? formatAmountInput(String(value)) : "");
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    // Giá trị đổi từ bên ngoài (chip nhanh, áp dụng kịch bản…): đồng bộ lại chuỗi hiển thị.
    setLastValue(value);
    if (parseAmountInput(text) !== value) setText(value ? formatAmountInput(String(value)) : "");
  }
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-[14px] border border-border bg-bg px-3.5 focus-within:border-accent/60",
        className,
      )}
    >
      <input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        aria-label={rest["aria-label"]}
        onChange={(e) => {
          const next = formatAmountInput(e.target.value);
          setText(next);
          const n = parseAmountInput(next);
          setLastValue(n);
          onChange(n);
        }}
        className={cn(
          "min-w-0 grow border-0 bg-transparent font-display text-base font-bold text-text outline-none placeholder:text-dim",
          inputClassName,
        )}
      />
      {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
    </div>
  );
}
