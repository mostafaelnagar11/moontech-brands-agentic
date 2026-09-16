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
 * There is no password. A code sent to the address is the proof, which
 * means signing up and signing in are the same two steps and neither
 * HeyMoon nor the brand is holding a secret that can be lost. That also
 * removes the "do I already have an account" question: the answer is
 * the same form either way.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle, EnvelopeSimple } from "@phosphor-icons/react";
import { Btn, Sheet } from "./ui";
import { signIn } from "../lib/store";

const LEN = 6;
/* Deliberately loose. It is checking that a person typed an address
   rather than policing which addresses exist — the code that arrives
   there is what actually proves the account. */
const LOOKS_LIKE_EMAIL = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

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
  const [resent, setResent] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const emailBox = useRef<HTMLInputElement>(null);

  /* Every open is a fresh attempt. A sheet that reopens holding the
     half-typed code from a run the brand abandoned is a sheet that
     looks broken. */
  useEffect(() => {
    if (!open) return;
    setStep("email");
    setDigits(Array(LEN).fill(""));
    setBusy(false);
    setResent(false);
    const t = setTimeout(() => emailBox.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (step !== "code") return;
    const t = setTimeout(() => boxes.current[0]?.focus(), 120);
    return () => clearTimeout(t);
  }, [step]);

  const sendCode = () => {
    if (!LOOKS_LIKE_EMAIL(email) || busy) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setStep("code"); }, 850);
  };

  const verify = (code: string) => {
    if (code.length < LEN || busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      signIn(email.trim(), Date.now());
      onVerified(email.trim());
    }, 800);
  };

  /* Whatever arrives at a box is spread from that box onward. One
     character is a keystroke; six are a paste, an autofill from the
     phone's SMS suggestion, or a fast typist whose keys landed before
     React moved the focus. One code path for all of them, because the
     version that only took the last character dropped five digits out
     of every autofill. */
  const fill = (from: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    const next = [...digits];
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

  return (
    <Sheet open={open} onClose={onClose} labelledBy="signin-title">
      <div className="p-5 sm:p-6">
        {step === "email" ? (
          <>
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand">
              <EnvelopeSimple size={18} weight="fill" />
            </span>
            <h2 id="signin-title" className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-ink">
              Your email, before you pay
            </h2>
            <p className="mt-1.5 text-meta leading-5 text-ink-soft">
              HeyMoon sends a six digit code to confirm it is you. New here or not, it is the same two steps: there is
              no password to make or remember.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); sendCode(); }}
              noValidate
              className="mt-4"
            >
              <label htmlFor="signin-email" className="mb-1 block text-[11px] font-semibold text-ink-soft">
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
                className="w-full rounded-control border border-black/[0.09] bg-white px-3 py-2.5 text-body text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn type="submit" disabled={!LOOKS_LIKE_EMAIL(email) || busy}>
                  {busy ? "Sending the code…" : "Send the code"}
                </Btn>
                <Btn type="button" variant="ghost" onClick={onClose}>Not yet</Btn>
              </div>
            </form>

            <p className="mt-4 text-[11px] leading-4 text-ink-faint">
              HeyMoon uses this address for the receipt, the drafts waiting on you and nothing else.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="-ms-1 mb-2 inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-meta font-semibold text-ink-soft transition hover:bg-black/[0.04]"
            >
              <ArrowLeft size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
              Use a different email
            </button>
            <h2 id="signin-title" className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
              Enter the code
            </h2>
            <p className="mt-1.5 text-meta leading-5 text-ink-soft">
              Six digits, sent to <span dir="ltr" className="font-semibold text-ink">{email.trim()}</span>.
            </p>

            <div dir="ltr" className="mt-4 flex gap-2" onPaste={paste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { boxes.current[i] = el; }}
                  value={d}
                  onChange={(e) => fill(i, e.target.value)}
                  onKeyDown={(e) => key(i, e)}
                  onFocus={(e) => e.currentTarget.select()}
                  maxLength={LEN}
                  disabled={busy}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1} of ${LEN}`}
                  className="num h-12 w-full min-w-0 rounded-control border border-black/[0.09] bg-white text-center text-[20px] font-semibold text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/10 disabled:bg-neutral-50"
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Btn type="button" disabled={digits.join("").length < LEN || busy} onClick={() => verify(digits.join(""))}>
                {busy ? "Checking…" : "Verify"}
              </Btn>
              <button
                type="button"
                onClick={() => setResent(true)}
                className="text-meta font-semibold text-brand transition hover:underline"
              >
                Send it again
              </button>
              {resent && (
                <span className="flex items-center gap-1.5 text-meta text-good-deep">
                  <CheckCircle size={13} weight="fill" aria-hidden />
                  Sent
                </span>
              )}
            </div>

            <p className="mt-4 text-[11px] leading-4 text-ink-faint">
              This is a prototype, so no email is actually sent. Any six digits are accepted.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
