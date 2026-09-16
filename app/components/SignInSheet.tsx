"use client";

/* The account, asked for once, at the only moment it is needed.
 *
 * Everything before this is free and anonymous: the read, the plan, the
 * two numbers, the creators. A form in front of any of that would be a
 * toll gate on the part that sells the product. But money cannot move
 * for nobody, so the gate sits exactly at the payment and nowhere
 * earlier — press Start Phase 1 and this opens; verify, and it closes
 * onto the payment card that was always the next thing.
 *
 * The two screens are the ones the current web app already has, kept
 * beat for beat so a brand who has signed in to HeyMoon before is not
 * learning a new flow inside a new product: work email, then Continue,
 * then six boxes under a countdown with the demo code printed below
 * them. What changed is the copy, which follows this product's rules —
 * sentence case, no exclamation marks — and the sign-up line, which is
 * a sentence rather than a link, because with an emailed code there is
 * no separate sign-up to link to. The code IS the account.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";
import { Sheet } from "./ui";
import { Wordmark } from "./Wordmark";
import { signIn } from "../lib/store";
import { hash } from "../lib/agent/rng";

const LEN = 6;
const EXPIRES_IN = 60;

/* Deliberately loose. It is checking that a person typed an address
   rather than policing which addresses exist — the code that arrives
   there is what actually proves the account. */
const LOOKS_LIKE_EMAIL = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/* The demo code, derived from the address rather than drawn at random:
   the same email always gets the same six digits, so a screenshot, a
   walkthrough and a test all agree, and nothing here is one of the
   non-deterministic calls this codebase keeps out of its logic. */
const demoCodeFor = (email: string) =>
  String(Math.abs(hash(email.trim().toLowerCase())) % 1_000_000).padStart(LEN, "0");

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function SignInSheet({ open, onClose, onVerified }: {
  open: boolean;
  onClose: () => void;
  /** Runs after the sheet closes, with the verified address. */
  onVerified: (email: string) => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [left, setLeft] = useState(EXPIRES_IN);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const emailBox = useRef<HTMLInputElement>(null);

  const code = demoCodeFor(email);
  const typed = digits.join("");
  const expired = left <= 0;

  /* Every open is a fresh attempt. A sheet that reopens holding the
     half-typed code from a run the brand abandoned looks broken. */
  useEffect(() => {
    if (!open) return;
    setStep("email");
    setDigits(Array(LEN).fill(""));
    setBusy(false);
    setWrong(false);
    const t = setTimeout(() => emailBox.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  /* The countdown belongs to the code screen and restarts with it, so
     going back to change the address does not leave a stale clock. */
  useEffect(() => {
    if (step !== "code") return;
    setLeft(EXPIRES_IN);
    const t = setTimeout(() => boxes.current[0]?.focus(), 120);
    const id = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [step]);

  const sendCode = () => {
    if (!LOOKS_LIKE_EMAIL(email) || busy) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setStep("code"); }, 850);
  };

  const again = () => {
    setDigits(Array(LEN).fill(""));
    setWrong(false);
    setLeft(EXPIRES_IN);
    boxes.current[0]?.focus();
  };

  const verify = (entered: string) => {
    if (entered.length < LEN || busy || expired) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (entered !== code) {
        setWrong(true);
        setDigits(Array(LEN).fill(""));
        boxes.current[0]?.focus();
        return;
      }
      signIn(email.trim(), Date.now());
      onVerified(email.trim());
    }, 700);
  };

  /* Whatever arrives at a box is spread from that box onward. One
     character is a keystroke; six are a paste, an autofill from the
     phone's SMS suggestion, or a fast typist whose keys landed before
     React moved the focus. One code path for all of them, because the
     version that kept only the last character dropped five digits out
     of every autofill. */
  const fill = (from: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    const next = [...digits];
    setWrong(false);
    if (!d) { next[from] = ""; setDigits(next); return; }
    for (let k = 0; k < d.length && from + k < LEN; k++) next[from + k] = d[k];
    setDigits(next);
    boxes.current[Math.min(from + d.length, LEN - 1)]?.focus();
    const full = next.join("");
    if (full.length === LEN) verify(full);
  };

  const paste = (e: React.ClipboardEvent) => {
    const d = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!d) return;
    e.preventDefault();
    fill(0, d.slice(0, LEN));
  };

  const key = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      boxes.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) boxes.current[i + 1]?.focus();
  };

  const wide = "w-full rounded-control py-3 text-body font-semibold transition disabled:cursor-not-allowed";

  return (
    <Sheet open={open} onClose={onClose} labelledBy="signin-title">
      <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8">
        {step === "email" ? (
          <>
            <Wordmark size="lg" />
            <h2 id="signin-title" className="mt-6 text-[24px] font-semibold tracking-[-0.03em] text-ink">
              Let&apos;s get started
            </h2>
            <p className="mt-1.5 text-body text-ink-soft">Enter your work email to sign in</p>

            <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate className="mt-6">
              <label htmlFor="signin-email" className="mb-2 block text-eyebrow font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Work email
              </label>
              <input
                ref={emailBox}
                id="signin-email"
                type="email"
                dir="ltr"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstore.com"
                className="w-full rounded-control border-2 border-brand/50 bg-white px-4 py-3 text-body text-ink outline-none transition placeholder:text-ink-faint focus:border-brand"
              />
              <button
                type="submit"
                disabled={!LOOKS_LIKE_EMAIL(email) || busy}
                className={`${wide} mt-4 bg-brand text-white hover:bg-brand-hover disabled:bg-neutral-100 disabled:text-ink-faint`}
              >
                {busy ? "Sending the code" : "Continue"}
              </button>
            </form>

            {/* A sentence, not a link. With an emailed code there is no
                separate sign-up screen to send anyone to: the first
                code an address accepts is what creates the account. */}
            <p className="mt-5 text-center text-meta text-ink-soft">
              No account yet? The same email makes one.
            </p>
            <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">
              By continuing you agree to the HeyMoon terms and privacy policy.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("email")}
              aria-label="Back to the email"
              className="grid h-9 w-9 place-items-center rounded-control border border-hairline bg-white text-ink-soft transition hover:bg-neutral-50"
            >
              <ArrowLeft size={15} weight="bold" aria-hidden className="rtl:rotate-180" />
            </button>

            <span aria-hidden className="mt-5 grid h-11 w-11 place-items-center rounded-control bg-brand-100 text-brand">
              <EnvelopeSimple size={19} weight="fill" />
            </span>
            <h2 id="signin-title" className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-ink">
              Check your inbox
            </h2>
            <p className="mt-1.5 text-body text-ink-soft">
              HeyMoon sent a 6 digit code to <span dir="ltr" className="font-semibold text-ink">{email.trim()}</span>
            </p>

            <div dir="ltr" className="mt-5 flex gap-2" onPaste={paste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { boxes.current[i] = el; }}
                  value={d}
                  onChange={(e) => fill(i, e.target.value)}
                  onKeyDown={(e) => key(i, e)}
                  onFocus={(e) => e.currentTarget.select()}
                  disabled={busy || expired}
                  inputMode="numeric"
                  maxLength={LEN}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1} of ${LEN}`}
                  aria-invalid={wrong || undefined}
                  className={`num h-14 w-full min-w-0 rounded-control border bg-white text-center text-[22px] font-semibold text-ink outline-none transition focus:ring-2 focus:ring-brand/10 disabled:bg-neutral-50 ${
                    wrong ? "border-danger" : "border-black/[0.12] focus:border-brand"
                  }`}
                />
              ))}
            </div>

            <p className="mt-3 text-center text-meta text-ink-faint" role={wrong ? "alert" : undefined}>
              {wrong ? (
                <span className="font-semibold text-danger">That code is not right. Try again.</span>
              ) : expired ? (
                <span className="font-semibold text-danger">The code expired.</span>
              ) : (
                <>Code expires in <span className="num font-semibold text-ink-soft">{mmss(left)}</span></>
              )}
            </p>

            <button
              type="button"
              onClick={() => (expired ? again() : verify(typed))}
              disabled={busy || (!expired && typed.length < LEN)}
              className={`${wide} mt-4 bg-brand text-white hover:bg-brand-hover disabled:bg-neutral-100 disabled:text-ink-faint`}
            >
              {busy ? "Checking" : expired ? "Send a new code" : "Verify code"}
            </button>

            {/* The current app prints the demo code under the boxes, so
                this does too. No email leaves a prototype. */}
            <p className="mt-4 text-center text-meta text-ink-faint">
              Demo code: <span className="num font-semibold tracking-[0.08em] text-ink-soft">{code}</span>
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
