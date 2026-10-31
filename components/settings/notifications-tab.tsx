"use client";

import { Copy, ExternalLink, Send, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useTelegram } from "@/hooks/use-telegram";
import { addDays, APP_TZ, localDate } from "@/lib/dates";
import type { Profile, ProfileUpdate } from "@/lib/supabase/types";
import { formatLinkCode, type LinkCode } from "@/lib/supabase/telegram";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { msg } from "@/supabase/functions/_shared/messages.ts";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
const EVENING_TIMES = ["19:00", "20:00", "21:00", "22:00", "23:00"];

/** Hiển thị HTML của bot (chỉ có <b>) mà không dùng innerHTML. */
function TgText({ html }: { html: string }) {
  const unescape = (s: string) =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return (
    <>
      {html.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line.split(/(<b>.*?<\/b>)/g).map((part, j) =>
            part.startsWith("<b>") ? (
              <strong key={j} className="font-semibold text-text">
                {unescape(part.slice(3, -4))}
              </strong>
            ) : (
              <span key={j}>{unescape(part)}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

function useMinutesLeft(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000)) : 0;
}

function LinkCodeBox({
  code,
  onRefresh,
  pending,
}: {
  code: LinkCode;
  onRefresh: () => void;
  pending: boolean;
}) {
  const minutes = useMinutesLeft(code.expires_at);
  const expired = minutes === 0;
  const pretty = formatLinkCode(code.code);
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-border-strong bg-bg p-4">
      <span className="text-xs font-semibold tracking-[1px] text-muted-foreground uppercase">
        {t.settings.telegram.otherDevice}
      </span>
      <span className="text-[13px] leading-normal text-soft">
        {BOT ? t.settings.telegram.howTo(BOT) : t.settings.telegram.howToNoBot}
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "font-display text-[26px] font-bold tracking-[3px]",
            expired ? "text-dim line-through" : "text-accent",
          )}
          aria-label={code.code.split("").join(" ")}
        >
          {pretty}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code.code);
              toast.success(t.settings.telegram.copied);
            } catch {
              /* trình duyệt chặn clipboard */
            }
          }}
          disabled={expired}
        >
          <Copy className="size-3.5" aria-hidden />
          {t.settings.telegram.copy}
        </Button>
        {BOT && !expired && (
          <a
            href={`https://t.me/${BOT}?start=${code.code}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t.settings.telegram.openTelegram}
          </a>
        )}
        <span className="text-xs text-muted-foreground">
          {expired ? t.settings.telegram.expired : t.settings.telegram.expiresIn(minutes)}
        </span>
        {expired && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={pending}>
            {t.settings.telegram.newCode}
          </Button>
        )}
      </div>
    </div>
  );
}

function TelegramCard({ profile }: { profile: Profile }) {
  const { createCode, disconnect, sendTest } = useTelegram();
  const [code, setCode] = useState<LinkCode | null>(null);
  const [confirm, setConfirm] = useState(false);
  const connected = Boolean(profile.telegram_chat_id);
  // Đang chờ người dùng bấm Start trong bot: hỏi lại trạng thái mỗi 4 giây.
  useProfile({ refetchInterval: code && !connected ? 4000 : false });

  const generate = async () => {
    try {
      setCode(await createCode.mutateAsync());
    } catch {
      toast.error(t.settings.saveError);
    }
  };

  return (
    <div className="flex flex-col gap-5 card p-6">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cat-sky-bg text-cat-sky">
          <Send className="size-[22px]" aria-hidden />
        </span>
        <div className="flex min-w-0 grow flex-col gap-[3px]">
          <span className="text-base font-semibold">{t.settings.telegram.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", connected ? "bg-cat-green" : "bg-dim")}
            />
            {connected
              ? t.settings.telegram.connected(profile.telegram_username)
              : code
                ? t.settings.telegram.waiting
                : t.settings.telegram.notConnected}
          </span>
        </div>
        {connected ? (
          <>
            <Button
              variant="field"
              className="min-h-10"
              disabled={sendTest.isPending}
              onClick={async () => {
                try {
                  await sendTest.mutateAsync();
                  toast.success(t.settings.telegram.testSent);
                } catch {
                  toast.error(t.settings.telegram.testFailed);
                }
              }}
            >
              {t.settings.telegram.test}
            </Button>
            <Button
              variant="field"
              className="min-h-10 text-danger hover:text-danger"
              disabled={disconnect.isPending}
              onClick={async () => {
                if (!confirm) return setConfirm(true);
                try {
                  await disconnect.mutateAsync();
                  setConfirm(false);
                  toast.success(t.settings.telegram.disconnected);
                } catch {
                  toast.error(t.settings.saveError);
                }
              }}
            >
              <Unlink className="size-4" aria-hidden />
              {confirm ? t.settings.telegram.disconnectConfirm : t.settings.telegram.disconnect}
            </Button>
          </>
        ) : (
          !code && (
            <Button className="min-h-10" onClick={generate} disabled={createCode.isPending}>
              {t.settings.telegram.createCode}
            </Button>
          )
        )}
      </div>
      {code ? (
        <LinkCodeBox code={code} onRefresh={generate} pending={createCode.isPending} />
      ) : (
        connected && (
          <button
            type="button"
            onClick={generate}
            disabled={createCode.isPending}
            className="flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border-strong bg-bg px-4 text-left text-[13px] text-soft hover:text-text"
          >
            <span className="text-xs font-semibold tracking-[1px] text-muted-foreground uppercase">
              {t.settings.telegram.otherDevice}
            </span>
            <span className="font-medium text-accent">{t.settings.telegram.createCode}</span>
          </button>
        )
      )}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  extra,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-2 py-3.5">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {extra}
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function RemindList({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const save = (patch: ProfileUpdate) =>
    update.mutate({ id: profile.id, patch }, { onError: () => toast.error(t.settings.saveError) });
  const evening = profile.daily_summary_at?.slice(0, 5) ?? null;
  const [time, setTime] = useState(evening ?? "21:00");
  const r = t.settings.remind;

  return (
    <div className="flex flex-col card px-6 py-2">
      <h2 className="m-0 pt-4 pb-2.5 text-[15px] font-semibold">{r.title}</h2>
      {!profile.telegram_chat_id && (
        <p className="m-0 pb-3 text-xs text-cat-orange">{r.needTelegram}</p>
      )}
      <ToggleRow
        id="n-bill"
        label={r.bills}
        hint={r.billsHint}
        checked={profile.notify_bills}
        onChange={(v) => save({ notify_bills: v })}
      />
      <ToggleRow
        id="n-count"
        label={r.countdowns}
        hint={r.countdownsHint}
        checked={profile.notify_countdowns}
        onChange={(v) => save({ notify_countdowns: v })}
      />
      <ToggleRow
        id="n-budget"
        label={r.budget}
        hint={r.budgetHint}
        checked={profile.notify_budget}
        onChange={(v) => save({ notify_budget: v })}
      />
      <ToggleRow
        id="n-daily"
        label={r.evening}
        hint={r.eveningHint}
        checked={evening !== null}
        onChange={(v) => save({ daily_summary_at: v ? `${time}:00` : null })}
        extra={
          <select
            aria-label={r.eveningTime}
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (evening !== null) save({ daily_summary_at: `${e.target.value}:00` });
            }}
            className="min-h-10 cursor-pointer rounded-[10px] border border-border bg-bg px-2.5 text-base text-text outline-none md:min-h-9 md:text-[13px]"
          >
            {EVENING_TIMES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        }
      />
      <div className="[&>div]:pb-[18px]">
        <ToggleRow
          id="n-log"
          label={r.log}
          hint={r.logHint}
          checked={profile.telegram_log_expense}
          onChange={(v) => save({ telegram_log_expense: v })}
        />
      </div>
    </div>
  );
}

function Bubble({
  from,
  time,
  children,
  buttons,
}: {
  from: "bot" | "me";
  time: string;
  children: React.ReactNode;
  buttons?: string[];
}) {
  return (
    <div
      className={cn("flex max-w-[92%] flex-col gap-1.5", from === "me" ? "self-end" : "self-start")}
    >
      <div
        className={cn(
          "flex flex-col gap-1.5 px-3.5 py-3 text-[13px] leading-normal",
          from === "me"
            ? "rounded-[16px_16px_4px_16px] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] text-text"
            : "rounded-[16px_16px_16px_4px] bg-surface-2 text-soft",
        )}
      >
        {children}
        <span
          className={cn(
            "self-end text-[10px]",
            from === "me" ? "text-muted-foreground" : "text-dim",
          )}
        >
          {time}
        </span>
      </div>
      {buttons && (
        <div className="flex gap-1.5">
          {buttons.map((b) => (
            <span
              key={b}
              className="grow rounded-xl bg-surface-2 px-3 py-2 text-center text-xs font-medium text-accent"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MessagePreview() {
  const today = localDate(new Date(), APP_TZ);
  const p = t.settings.preview;
  return (
    <aside
      aria-label={p.label}
      className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 lg:max-w-[380px]"
    >
      <span className="label-caps">{p.title}</span>
      <div className="flex flex-col gap-3.5 card p-5">
        <div className="flex items-center gap-2.5 border-b border-surface-2 pb-3">
          <LogoMark size={34} className="rounded-full" />
          <div className="flex flex-col gap-px">
            <span className="text-[13px] font-semibold">{BOT ? `@${BOT}` : t.app.name}</span>
            <span className="text-[11px] text-muted-foreground">{p.bot}</span>
          </div>
        </div>
        <Bubble from="bot" time="08:00" buttons={[p.markPaid]}>
          <TgText html={msg.bill("Tiền nhà", 4_500_000, addDays(today, 3), 3)} />
        </Bubble>
        <Bubble from="me" time="12:31">
          <span>{p.userSample}</span>
        </Bubble>
        <Bubble from="bot" time="12:31" buttons={[p.changeCategory, p.delete]}>
          <TgText
            html={msg.logged({
              type: "expense",
              amount: 65_000,
              category: "Ăn uống",
              fund: "Sinh hoạt",
              note: "cơm trưa",
              budget_remaining: 3_485_000,
            })}
          />
        </Bubble>
        <Bubble from="bot" time="08:00">
          <TgText html={msg.countdown("Sinh nhật mẹ", addDays(today, 16), 16)} />
        </Bubble>
      </div>
    </aside>
  );
}

export function NotificationsTab() {
  const profile = useProfile();
  if (!profile.data) return null;
  return (
    <div className="relative flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
        <TelegramCard profile={profile.data} />
        <RemindList profile={profile.data} />
      </div>
      <MessagePreview />
    </div>
  );
}
