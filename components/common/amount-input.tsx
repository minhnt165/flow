"use client";

import { useState } from "react";
import { AmountSuggestions } from "@/components/common/amount-suggestions";
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
  /** Tắt gợi ý ×1.000 / ×10.000 / ×100.000 khi đang gõ. */
  noSuggestions?: boolean;
  "aria-label"?: string;
};

// Ô nhập tiền: tự thêm dấu chấm nghìn khi gõ, giữ giá trị là số nguyên.
// Đang gõ số nhỏ thì gợi ý số tiền kiểu app ngân hàng (45 → 45.000 · 450.000 · 4.500.000).
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
  noSuggestions,
  ...rest
}: Props) {
  const [text, setText] = useState(value ? formatAmountInput(String(value)) : "");
  const [lastValue, setLastValue] = useState(value);
  // Chỉ gợi ý cho số người dùng vừa gõ, không gợi ý cho giá trị điền sẵn khi mở form sửa.
  // Không ẩn khi ô mất focus: chip biến mất lúc chạm xuống làm nội dung dưới dồn lên, chạm trượt.
  const [typing, setTyping] = useState(false);
  if (value !== lastValue) {
    // Giá trị đổi từ bên ngoài (chip nhanh, áp dụng kịch bản…): đồng bộ lại chuỗi hiển thị.
    setLastValue(value);
    if (parseAmountInput(text) !== value) setText(value ? formatAmountInput(String(value)) : "");
  }
  const pick = (v: number) => {
    setText(formatAmountInput(String(v)));
    setLastValue(v);
    setTyping(false);
    onChange(v);
  };
  return (
    <div className="flex min-w-0 flex-col gap-2">
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
            setTyping(true);
            onChange(n);
          }}
          className={cn(
            "min-w-0 grow border-0 bg-transparent font-display text-base font-bold text-text outline-none placeholder:text-dim",
            inputClassName,
          )}
        />
        {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {!noSuggestions && typing && <AmountSuggestions value={value} onPick={pick} />}
    </div>
  );
}
