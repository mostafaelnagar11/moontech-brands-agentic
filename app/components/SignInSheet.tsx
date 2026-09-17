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
 * learning a new flow inside a new product: details, then Continue,
 * then six boxes under a countdown with the demo code printed below
 * them. What changed is the copy, which follows this product's rules,
 * sentence case and no exclamation marks, and the sign-up line, which
 * is a sentence rather than a link, because with a texted code there is
 * no separate sign-up to link to. The code IS the account.
 *
 * What the first screen asks for is a name and a phone rather than a
 * work email. In the Gulf the owner's number is already the account on
 * Salla and on Zid, it is the thing they answer inside the hour, and it
 * is how an engineer reaches them when a connection needs a person. The
 * name is there because everything after this is addressed to someone:
 * the dashboard greets them by it and the drafts are waiting on them.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CaretDown, ChatCircleDots } from "@phosphor-icons/react";
import { Sheet } from "./ui";
import { Wordmark } from "./Wordmark";
import { signIn } from "../lib/store";
import { hash } from "../lib/agent/rng";

const LEN = 6;
const EXPIRES_IN = 60;

/* The markets this product sells into, and Saudi first because that is
   where HeyMoon is. Not a world list: a select with two hundred rows in
   it is a worse control than a short one that covers everybody who can
   actually use the product today. */
const DIAL_CODES = [
  { code: "+966", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Arabia" },
  { code: "+971", flag: "\u{1F1E6}\u{1F1EA}", name: "United Arab Emirates" },
  { code: "+965", flag: "\u{1F1F0}\u{1F1FC}", name: "Kuwait" },
  { code: "+974", flag: "\u{1F1F6}\u{1F1E6}", name: "Qatar" },
  { code: "+973", flag: "\u{1F1E7}\u{1F1ED}", name: "Bahrain" },
  { code: "+968", flag: "\u{1F1F4}\u{1F1F2}", name: "Oman" },
  { code: "+20", flag: "\u{1F1EA}\u{1F1EC}", name: "Egypt" },
];

/* Deliberately loose. It is checking that a person typed a number
   rather than policing which numbers exist, because the code that
   arrives there is what actually proves the account. */
const digitsOf = (v: string) => v.replace(/\D/g, "");
const LOOKS_LIKE_PHONE = (v: string) => digitsOf(v).length >= 7;

/* The demo code, derived from the number rather than drawn at random:
   the same phone always gets the same six digits, so a screenshot, a
   walkthrough and a test all agree, and nothing here is one of the
   non-deterministic calls this codebase keeps out of its logic. */
const demoCodeFor = (dial: string, phone: string) =>
  String(Math.abs(hash(`${dial}${digitsOf(phone)}`)) % 1_000_000).padStart(LEN, "0");

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function SignInSheet({ open, onClose, onVerified }: {
  open: boolean;
  onClose: () => void;
  /** Runs after the sheet closes, with the name that was verified. */
  onVerified: (name: string) => void;
}) {
  const [step, setStep] = useState<"details" | "code">("details");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dial, setDial] = useState(DIAL_CODES[0].code);
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [left, setLeft] = useState(EXPIRES_IN);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const firstBox = useRef<HTMLInputElement>(null);

  const code = demoCodeFor(dial, phone);
  const typed = digits.join("");
  const expired = left <= 0;
  const shown = `${dial} ${digitsOf(phone)}`;
  const ready = !!first.trim() && !!last.trim() && LOOKS_LIKE_PHONE(phone);

  /* Every open is a fresh attempt. A sheet that reopens holding the
     half-typed code from a run the brand abandoned looks broken. */
  useEffect(() => {
    if (!open) return;
    setStep("details");
    setDigits(Array(LEN).fill(""));
    setBusy(false);
    setWrong(false);
    const t = setTimeout(() => firstBox.current?.focus(), 120);
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
    if (!ready || busy) return;
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
      signIn(
        { firstName: first.trim(), lastName: last.trim(), dialCode: dial, phone: digitsOf(phone) },
        Date.now()
      );
      onVerified(`${first.trim()} ${last.trim()}`);
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
        {step === "details" ? (
          <>
            <Wordmark size="lg" />
            <h2 id="signin-title" className="mt-6 text-[24px] font-semibold tracking-[-0.03em] text-ink">
              Let&apos;s get started
            </h2>
            <p className="mt-1.5 text-body text-ink-soft">HeyMoon texts a code to confirm it is you</p>

            <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate className="mt-6">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: "signin-first", label: "First name", v: first, set: setFirst, ref: firstBox, ac: "given-name" },
                  { id: "signin-last", label: "Last name", v: last, set: setLast, ref: undefined, ac: "family-name" },
                ] as const).map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="mb-2 block text-eyebrow font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      {f.label}
                    </label>
                    <input
                      ref={f.ref}
                      id={f.id}
                      value={f.v}
                      onChange={(e) => f.set(e.target.value)}
                      autoComplete={f.ac}
                      spellCheck={false}
                      /* A focused field darkens its own hairline and
                         nothing more. The purple stroke it used to draw
                         was the brand colour doing a job the caret
                         already does, on every field in turn, which
                         made filling the form flash. */
                      className="w-full rounded-control border border-black/[0.1] bg-white px-4 py-3 text-body text-ink outline-none transition placeholder:text-ink-faint focus:border-ink/25"
                    />
                  </div>
                ))}
              </div>

              <label htmlFor="signin-phone" className="mb-2 mt-4 block text-eyebrow font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Phone number
              </label>
              {/* The code and the number are one control with a seam in
                  it, not two fields: they are one answer, and a select
                  sitting apart from the box it belongs to invites a
                  brand to fill in only half of it. Always ltr, because a
                  phone number is dialled left to right in every
                  language. */}
              <div
                dir="ltr"
                className="flex items-stretch overflow-hidden rounded-control border border-black/[0.1] bg-white transition focus-within:border-ink/25"
              >
                {/* The caret is drawn rather than left to the browser,
                    which puts its own arrow hard against the right edge
                    and therefore hard against the seam. Drawing it
                    means the select can reserve room for it: `pr-8`
                    holds the arrow, and the seam sits clear of both. */}
                <div className="relative shrink-0">
                  <select
                    aria-label="Country code"
                    value={dial}
                    onChange={(e) => setDial(e.target.value)}
                    className="h-full appearance-none bg-transparent py-3 pl-3.5 pr-8 text-body font-semibold text-ink outline-none"
                  >
                    {DIAL_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag}  {c.code}</option>
                    ))}
                  </select>
                  <CaretDown
                    size={11}
                    weight="bold"
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                </div>
                <span aria-hidden className="my-2 w-px shrink-0 bg-black/[0.08]" />
                <input
                  id="signin-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50 123 4567"
                  className="num w-full min-w-0 bg-transparent px-3 py-3 text-body text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
                />
              </div>

              <button
                type="submit"
                disabled={!ready || busy}
                className={`${wide} mt-4 bg-brand text-white hover:bg-brand-hover disabled:bg-neutral-100 disabled:text-ink-faint`}
              >
                {busy ? "Sending the code" : "Continue"}
              </button>
            </form>

            {/* A sentence, not a link. With a texted code there is no
                separate sign-up screen to send anyone to: the first
                code a number accepts is what creates the account. */}
            <p className="mt-5 text-center text-meta text-ink-soft">
              No account yet? The same number makes one.
            </p>
            <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">
              By continuing you agree to the HeyMoon terms and privacy policy.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("details")}
              aria-label="Back to your details"
              className="grid h-9 w-9 place-items-center rounded-control border border-hairline bg-white text-ink-soft transition hover:bg-wash"
            >
              <ArrowLeft size={15} weight="bold" aria-hidden className="rtl:rotate-180" />
            </button>

            <span aria-hidden className="mt-5 grid h-11 w-11 place-items-center rounded-control bg-brand-100 text-brand">
              <ChatCircleDots size={19} weight="fill" />
            </span>
            <h2 id="signin-title" className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-ink">
              Check your phone
            </h2>
            <p className="mt-1.5 text-body text-ink-soft">
              HeyMoon sent a 6 digit code to <span dir="ltr" className="num font-semibold text-ink">{shown}</span>
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
                  className={`num h-14 w-full min-w-0 rounded-control border bg-white text-center text-[22px] font-semibold text-ink outline-none transition disabled:bg-wash ${
                    wrong ? "border-danger" : "border-black/[0.12] focus:border-ink/30"
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
                this does too. No message leaves a prototype. */}
            <p className="mt-4 text-center text-meta text-ink-faint">
              Demo code: <span className="num font-semibold tracking-[0.08em] text-ink-soft">{code}</span>
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
