"use client";

/* How a campaign runs, as four steps that advance on their own.
 *
 * The list on one side, one picture of the product on the other, and a
 * gradient rule under the open step that fills as its time runs out.
 * The rule is the honest part of the pattern: a panel that changes by
 * itself with nothing to explain why feels broken, and a progress bar
 * that is really the timer tells the reader exactly what is happening
 * and how long they have.
 *
 * It only advances while it is on screen, the tab is visible and nobody
 * is pointing at it. Pressing a step takes it over and the timer stops,
 * because a reader who has chosen a step is reading it. Under
 * prefers-reduced-motion it never advances at all: the first step is
 * open, and the other three are one press away.
 */

import { useEffect, useRef, useState } from "react";
import { useT } from "../../lib/i18n";

const STEP_MS = 7000;

export interface Step {
  key: string;
  title: string;
  body: string;
  agent: string;
  /* A function when the panel has to know it is the open one: the last
     step counts its figure up, and a count that ran while the step was
     hidden would be over before anyone saw it. */
  panel: React.ReactNode | ((active: boolean) => React.ReactNode);
}

export function Run({ steps }: { steps: Step[] }) {
  const { t } = useT();
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [taken, setTaken] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* Only while it is on screen, and never for a reader who has asked
     the system to stop moving things. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || taken) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setAt((n) => (n + 1) % steps.length);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [running, taken, steps.length]);

  const live = running && !taken;

  return (
    <div
      ref={box}
      onMouseEnter={() => setRunning(false)}
      onMouseLeave={() => setRunning(true)}
      className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
    >
      <ol className="order-last lg:order-first">
        {steps.map((s, i) => {
          const open = i === at;
          return (
            <li key={s.key} className="border-t border-ink/[0.09] last:border-b">
              <button
                type="button"
                onClick={() => { setAt(i); setTaken(true); }}
                aria-expanded={open}
                className="w-full py-5 text-start"
              >
                <span className="flex items-baseline gap-3">
                  <span className={`num text-[12px] font-semibold ${open ? "text-brand" : "text-ink/30"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`text-[17px] font-semibold tracking-[-0.02em] transition-colors ${open ? "text-ink" : "text-ink/45"}`}>
                    {s.title}
                  </span>
                </span>
                {/* The body and the timer belong to the open step only.
                    A grid that animates to zero height keeps the rows
                    from jumping as the panel changes. */}
                <span
                  className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <span className="overflow-hidden">
                    {/* The indent belongs to the group, not to the
                        track: padding on the track itself pushed the
                        fill in by 26px and the bar started short. */}
                    <span className="block ps-[26px]">
                    <span className="mt-2.5 block max-w-[46ch] text-[15px] leading-[1.6] text-ink/55">{s.body}</span>
                    <span className="mt-4 block h-[2px] w-full rounded-full bg-ink/[0.07]">
                      <span
                        key={`${s.key}-${at}-${live}`}
                        className="hm-grad-rule block h-full rounded-full"
                        style={
                          live
                            ? { animation: `run-fill ${STEP_MS}ms linear forwards` }
                            : { width: "100%" }
                        }
                      />
                    </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        <li className="pt-5 text-[13px] text-ink/40">
          {t("landing.foot.agents")} · <span className="text-ink/60">{steps[at].agent}</span>
        </li>
      </ol>

      {/* The panel. One media surface, the mock inside it swapped with
          the step, so the eye has somewhere fixed to look. */}
      <div className="hm-media relative h-[340px] overflow-hidden rounded-[22px] ring-1 ring-ink/[0.06] sm:h-[380px]">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
              i === at ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {typeof s.panel === "function" ? s.panel(i === at) : s.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
