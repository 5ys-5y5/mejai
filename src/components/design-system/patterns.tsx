import { cn } from "@/lib/utils";

export function PanelCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-300 bg-slate-50", className)}>{children}</div>;
}

export function AdminTag() {
  return (
    <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
      ADMIN
    </span>
  );
}

export function StateBanner({
  tone,
  title,
  description,
  className,
}: {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description: string;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={cn("rounded-xl border px-3 py-2", toneClass, className)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs opacity-90">{description}</div>
    </div>
  );
}

export function InlineToggle({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      className={cn(
        checked
          ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white"
          : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white",
        className
      )}
      aria-label={checked ? "ON" : "OFF"}
    >
      {checked ? "ON" : "OFF"}
    </span>
  );
}

export function SectionBlock({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
