import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  aside,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label-caps">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-[14px] border px-4 py-3 text-sm leading-relaxed",
        error
          ? "border-cat-red/30 bg-cat-red-bg text-cat-red"
          : "border-cat-green/30 bg-cat-green-bg text-cat-green",
      )}
    >
      {error ?? message}
    </p>
  );
}
