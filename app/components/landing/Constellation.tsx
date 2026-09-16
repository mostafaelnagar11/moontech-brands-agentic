"use client";

/* The seven agents, as a system rather than as a table.
 *
 * This replaced a seven-row list of name and stage. The list was
 * accurate and completely inert: to learn anything from it you had to
 * read all seven rows, and nobody reads seven rows on a landing page.
 * The shape of the thing is the point, so the shape is what is drawn.
 * One core, seven specialists around it, every one wired back to the
 * middle. A visitor takes that in without reading a word, and the
 * names are there for the one who leans in.
 *
 * The geometry is computed, not typed: `RING` places each node on a
 * circle in percentages, so the whole diagram scales with its square
 * container from a phone to a wide display without a single breakpoint.
 * Angles start at the top and run clockwise.
 */

import { Brain, ChartLineUp, Megaphone, PenNib, ShieldCheck, Storefront, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AGENTS } from "../../lib/agent/agents";
import { useT } from "../../lib/i18n";

const ICONS: Icon[] = [Storefront, UsersThree, ShieldCheck, PenNib, Megaphone, ChartLineUp, Brain];

const STAGES = [
  "landing.stage.intake", "landing.stage.matching", "landing.stage.safety", "landing.stage.creative",
  "landing.stage.activation", "landing.stage.optimization", "landing.stage.learning",
] as const;

/** Seven points on a circle, from the top, clockwise. Percent of the
    square so everything scales together. */
const RADIUS = 37;
const RING = AGENTS.map((_, i) => {
  const a = (-90 + i * (360 / AGENTS.length)) * (Math.PI / 180);
  return { x: 50 + RADIUS * Math.cos(a), y: 50 + RADIUS * Math.sin(a) };
});

export function Constellation() {
  const { t } = useT();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* The wiring. Drawn under everything, faint enough to read as
          structure rather than as decoration. */}
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="hm-core-glow">
            <stop offset="0%" stopColor="#7C5CE0" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#F0559D" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F0559D" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hm-pulse" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F0559D" />
            <stop offset="100%" stopColor="#A98BFF" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="34" fill="url(#hm-core-glow)" className="motion-safe:hm-breathe" />
        <circle
          cx="50" cy="50" r={RADIUS} fill="none"
          stroke="rgba(255,255,255,0.10)" strokeWidth="0.3" strokeDasharray="1.4 1.8"
          className="motion-safe:hm-ring"
        />
        {RING.map((p, i) => (
          <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.3" />
        ))}
        {/* The dispatch. One pulse per spoke, offset around the ring so
            the core is never idle and never firing all seven at once. */}
        {RING.map((p, i) => (
          <line
            key={`pulse-${i}`}
            x1="50" y1="50" x2={p.x} y2={p.y}
            stroke="url(#hm-pulse)" strokeWidth="0.7" strokeLinecap="round"
            className="hm-spoke"
            style={{ animationDelay: `${(i * 3600) / RING.length}ms` }}
          />
        ))}
      </svg>

      {/* The core. */}
      <div
        className="absolute left-1/2 top-1/2 grid h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[22%] shadow-[0_10px_40px_-8px_rgba(124,92,224,0.8)]"
        style={{ background: "linear-gradient(140deg, #4D2FB0, #7C5CE0 55%, #F0559D)" }}
      >
        {/* The mark: the four-pointed star, which is what an AI core
            looks like to anyone who has used one. A crescent sat here
            first and read as night, not as intelligence. */}
        <svg aria-hidden viewBox="0 0 24 24" className="h-[54%] w-[54%] text-white motion-safe:hm-star">
          <path
            d="M12 1.6c0 5.2 5.2 10.4 10.4 10.4C17.2 12 12 17.2 12 22.4 12 17.2 6.8 12 1.6 12 6.8 12 12 6.8 12 1.6Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* The seven. */}
      {AGENTS.map((name, i) => {
        const I = ICONS[i];
        const p = RING[i];
        return (
          <div
            key={name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className="hm-node grid h-[44px] w-[44px] place-items-center rounded-[14px] bg-white/[0.07] text-white/75 ring-1 ring-white/[0.12] backdrop-blur-sm sm:h-[52px] sm:w-[52px]"
                style={{ animationDelay: `${(i * 3600) / RING.length}ms` }}
              >
                <I size={20} weight="regular" aria-hidden />
              </span>
              {/* Names are the second read, not the first. */}
              <span className="whitespace-nowrap text-center text-[10px] font-medium leading-tight text-white/55 sm:text-[11px]">
                {name.replace(/ AI$/, "")}
                <span className="block text-white/30">{t(STAGES[i])}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
