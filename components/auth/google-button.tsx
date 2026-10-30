import { loginWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { t } from "@/messages/vi";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.48-1.68 4.34-5.35 4.34-3.22 0-5.85-2.67-5.85-5.96S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.96 14.54 3 12 3 6.98 3 2.9 7.03 2.9 12s4.08 9 9.1 9c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.15-1.51z" />
    </svg>
  );
}

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={loginWithGoogle}>
      <input type="hidden" name="next" value={next ?? ""} />
      <Button type="submit" variant="secondary" size="form" className="w-full font-semibold">
        <GoogleMark />
        {t.auth.google}
      </Button>
    </form>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-dim">
      <span className="h-px grow bg-surface-2" />
      {t.auth.orEmail}
      <span className="h-px grow bg-surface-2" />
    </div>
  );
}
