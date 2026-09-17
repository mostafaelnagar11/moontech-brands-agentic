"use client";

import type { ReactNode } from "react";

/* The small shared pieces. In the current app each of these is a class
   string retyped in five files; here they are components, so a change
   lands everywhere at once. */

export function Card({ children, className = "", as: As = "div", ...rest }: {
  children: ReactNode; className?: string; as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={`rounded-card border border-hairline bg-white shadow-card ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function Eyebrow({ children, tone = "brand", className = "" }: { children: ReactNode; tone?: "brand" | "muted" | "danger" | "good"; className?: string }) {
  const c = { brand: "text-brand-500", muted: "text-ink-faint", danger: "text-danger", good: "text-good-deep" }[tone];
  return <p className={`text-eyebrow font-semibold uppercase tracking-[0.14em] ${c} ${className}`}>{children}</p>;
}

export function Pill({ children, tone = "brand", className = "" }: { children: ReactNode; tone?: "brand" | "good" | "danger" | "muted" | "live"; className?: string }) {
  const c = {
    brand: "border-brand/20 bg-brand/[0.07] text-brand",
    good: "border-good/20 bg-good/[0.08] text-good-deep",
    danger: "border-danger/25 bg-danger/[0.07] text-danger",
    muted: "border-hairline bg-wash text-ink-faint",
    live: "border-brand/20 bg-brand/[0.07] text-brand",
  }[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-eyebrow font-semibold ${c} ${className}`}>
      {tone === "live" && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand animate-live" />}
      {children}
    </span>
  );
}

export function Btn({
  children, variant = "primary", size = "md", className = "", ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "quiet" | "ghost" | "danger";
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-hover disabled:bg-brand/40",
    quiet: "border border-black/[0.09] bg-white text-ink-soft hover:bg-wash disabled:text-ink-faint",
    ghost: "text-ink-soft hover:bg-black/[0.04] disabled:text-ink-faint",
    danger: "border border-danger/25 bg-danger/[0.07] text-danger hover:bg-danger/[0.12]",
  }[variant];
  const s = size === "sm" ? "px-3 py-1.5 text-meta" : "px-4 py-2.5 text-body";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A pending value. Never a spinner over the whole card — the parts that
    have arrived stay readable while the rest is still coming. */
export function Skeleton({ w = "100%", h = 12, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} style={{ width: w, height: h }} />;
}

export function Divider({ label, className = "" }: { label?: string; className?: string }) {
  if (!label) return <div className={`h-px bg-hairline ${className}`} />;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-meta font-medium text-ink-faint">{label}</span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

/** A bottom sheet on a phone, a centred dialog on a desktop. Used for
    every confirmation in the app, so the two never diverge. */
export function Sheet({ open, onClose, labelledBy, children, wide }: {
  open: boolean; onClose: () => void; labelledBy?: string; children: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`animate-fade-in relative max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] border border-hairline bg-white shadow-pop sm:rounded-card ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />
        {children}
      </div>
    </div>
  );
}

export function Avatar({ src, name, size = 32, className = "" }: { src?: string; name: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-[11px] font-semibold text-brand ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        name.split(" ").map((w) => w[0]).slice(0, 2).join("")
      )}
    </span>
  );
}
