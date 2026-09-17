"use client";

/* Settings, carried over from the current web app and told the truth.
 *
 * The current app's page has the right shape — the brand on the left,
 * the paperwork on the right, preferences and a danger zone under it —
 * and most of it was filled with values typed into the markup: a brand
 * called Ounass, a contact called Sarah, a phone number nobody gave.
 * Every field here reads from something real instead: the brand and its
 * eligibility from the read, the person from the account that signed
 * in, the billing details from whatever the brand has actually typed,
 * which starts out as nothing.
 *
 * Autonomy moved in here. It was a top-level destination beside
 * Campaigns and Ads, which put a settings table in the same rank as the
 * work; it is a preference about how HeyMoon behaves, so it belongs
 * with the other preferences. The rail is one row shorter for it.
 *
 * Nothing on this page can be filled in on the brand's behalf. A VAT
 * number, a trade licence and an office address are the three things an
 * invoice cannot be raised without, and a plausible-looking placeholder
 * in any of them is worse than a blank.
 */

import { useState } from "react";
import { CaretDown, Trash, WarningCircle } from "@phosphor-icons/react";
import { Btn, Sheet } from "../ui";
import { Section, Surface } from "./kit";
import { AutonomyView } from "./AutonomyView";
import {
  resetAll, setAccountDetails, setLocale, setProfile, useAccount, useActiveCampaign, useProfile, useStore,
} from "../../lib/store";
import { useT } from "../../lib/i18n";
import { getRead } from "../../lib/agent/registry";

const INDUSTRIES = [
  "Fashion and apparel", "Beauty and cosmetics", "Food and beverage",
  "Electronics", "Home and living", "Health and wellness", "Other",
];
const COUNTRIES = [
  "Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Other",
];

const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint";
const FIELD =
  "w-full rounded-control border border-black/[0.09] bg-white px-3.5 py-2.5 text-body text-ink outline-none transition focus-visible:outline-none placeholder:text-ink-faint focus:border-ink/25";

function Field({ label, value, onChange, placeholder, type = "text", dir }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: "ltr";
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
    </label>
  );
}

function Picker({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} appearance-none pe-9 ${value ? "" : "text-ink-faint"}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </div>
    </label>
  );
}

/* Four tabs rather than one long scroll. Settings is the only page in
   the product you arrive at knowing which thing you came to change, so
   a column that makes you scroll past the other three is a column that
   answers a question nobody asked. The grouping is by who the setting
   belongs to: the shop, the invoice, the person, and the agents. */
const TABS = [
  { key: "brand", label: "Brand" },
  { key: "billing", label: "Billing" },
  { key: "account", label: "Account" },
  { key: "autonomy", label: "Autonomy" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function SettingsView({ initialTab = "brand" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { locale } = useT();
  const account = useAccount();
  const profile = useProfile();
  const campaign = useActiveCampaign();
  const campaigns = useStore((s) => s.campaignOrder.length);
  const [confirming, setConfirming] = useState(false);

  /* The brand is whatever was read, not whatever was typed here. A shop
     that has never been read has nothing to show, and says so. */
  const read = campaign?.readId ? getRead(campaign.readId) : null;
  const brandName = read?.identity?.name.value ?? campaign?.brandName ?? "";
  const url = campaign?.url ?? "";
  const logo = read?.identity?.logo;
  const eligible = read?.eligibility?.state === "ok";

  const billingDone = !!profile.vat.trim() && !!profile.tradeLicence.trim() && !!profile.street.trim();

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Settings" className="flex flex-wrap gap-1 rounded-control border border-hairline bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-[9px] px-3.5 py-2 text-body font-semibold transition ${
              tab === t.key ? "bg-brand text-white" : "text-ink-faint hover:bg-wash hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brand" && (
      <Section title="Your brand">
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Surface className="p-6 text-center">
            <span className="mx-auto grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-full bg-wash">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[24px] font-semibold text-brand">{brandName[0] ?? "?"}</span>
              )}
            </span>
            <p className="mt-3 text-[17px] font-semibold text-ink">{brandName || "No brand yet"}</p>
            <p dir="ltr" className="mt-0.5 text-body text-ink-faint">{url || "Build a campaign to read one"}</p>
            {/* Eligibility is the read's finding, not a badge we award.
                It only appears when the read actually made it. */}
            {read && (
              <p className="mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[11px] font-semibold ${
                    eligible
                      ? "border-good/25 bg-good/[0.07] text-good-deep"
                      : "border-hairline bg-wash text-ink-faint"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${eligible ? "bg-good" : "bg-ink-faint"}`} />
                  {eligible ? "Eligible brand" : "Not eligible yet"}
                </span>
              </p>
            )}
          </Surface>

          <Surface className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name and website are the read's, and the read is
                  evidence: it is shown here and edited by correcting
                  the read itself, never by typing over it. */}
              <div>
                <span className={LABEL}>Brand name</span>
                <p className="rounded-control border border-hairline bg-wash px-3.5 py-2.5 text-body text-ink-soft">
                  {brandName || "Not read yet"}
                </p>
              </div>
              <div>
                <span className={LABEL}>Website</span>
                <p dir="ltr" className="rounded-control border border-hairline bg-wash px-3.5 py-2.5 text-body text-ink-soft">
                  {url || "Not read yet"}
                </p>
              </div>
              <Picker
                label="Industry"
                placeholder="Choose an industry"
                value={profile.industry}
                onChange={(industry) => setProfile({ industry })}
                options={INDUSTRIES}
              />
              <Picker
                label="Country"
                placeholder="Choose a country"
                value={profile.country}
                onChange={(country) => setProfile({ country })}
                options={COUNTRIES}
              />
            </div>
            <p className="mt-4 text-[11px] leading-4 text-ink-faint">
              The name and the website come from the read and are corrected there, so what settings says and what the
              campaign was built on cannot disagree.
            </p>
          </Surface>
        </div>
      </Section>
      )}

      {tab === "billing" && (
      <Section
        title="Business and billing"
        aside={
          <span
            className={`rounded-pill border px-2.5 py-1 text-[11px] font-semibold ${
              billingDone
                ? "border-good/25 bg-good/[0.07] text-good-deep"
                : "border-danger/25 bg-danger/[0.07] text-danger"
            }`}
          >
            {billingDone ? "Complete" : "Incomplete"}
          </span>
        }
      >
        <Surface className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="VAT or TRN number"
              dir="ltr"
              value={profile.vat}
              placeholder="300000000000003"
              onChange={(vat) => setProfile({ vat })}
            />
            <Field
              label="Trade licence"
              value={profile.tradeLicence}
              placeholder="The name on the licence"
              onChange={(tradeLicence) => setProfile({ tradeLicence })}
            />
            <Field
              label="Office street"
              value={profile.street}
              placeholder="Building and street"
              onChange={(street) => setProfile({ street })}
            />
            <Field
              label="City"
              value={profile.city}
              placeholder="City"
              onChange={(city) => setProfile({ city })}
            />
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-control bg-wash p-3">
            <WarningCircle size={14} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-ink-faint" />
            <p className="text-[11px] leading-4 text-ink-soft">
              An invoice cannot be raised without these three. Nothing here is filled in for you, because a
              plausible number in a tax field is worse than a blank one.
            </p>
          </div>
        </Surface>
      </Section>
      )}

      {tab === "account" && (
        <>
      <Section title="You">
        <Surface className="p-5">
          {account ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  value={account.firstName}
                  onChange={(firstName) => setAccountDetails({ firstName })}
                />
                <Field
                  label="Last name"
                  value={account.lastName}
                  onChange={(lastName) => setAccountDetails({ lastName })}
                />
              </div>
              <div className="mt-4">
                <span className={LABEL}>Phone</span>
                <div className="flex items-center justify-between gap-3 rounded-control border border-hairline bg-wash px-3.5 py-2.5">
                  <span dir="ltr" className="num text-body text-ink-soft">
                    {account.dialCode} {account.phone}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-good-deep">Verified</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
                  This is the number the code went to, so changing it means verifying the new one. Sign out and
                  back in with it.
                </p>
              </div>
            </>
          ) : (
            <p className="text-body text-ink-soft">
              Nobody has signed in yet. HeyMoon asks for a name and a number at the payment, and not before.
            </p>
          )}
        </Surface>
      </Section>

      <Section title="Preferences">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-hairline p-5">
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">Message me</p>
              <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">
                Drafts waiting on you, a phase unlocking, a report. Sent to the number that signed in.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.notifications}
              aria-label="Message me"
              onClick={() => setProfile({ notifications: !profile.notifications })}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-pill transition-colors ${
                profile.notifications ? "bg-brand" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  profile.notifications ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">Language</p>
              <p className="mt-0.5 max-w-[46ch] text-[11px] leading-4 text-ink-faint">
                Arabic, right to left, on the landing page, the read and the conversation. The dashboard follows when
                it is translated.
              </p>
            </div>
            <div className="flex shrink-0 gap-1 rounded-control border border-hairline bg-canvas p-1">
              {([
                { k: "en", label: "English" },
                { k: "ar", label: "العربية" },
              ] as const).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setLocale(o.k)}
                  aria-pressed={locale === o.k}
                  className={`rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition ${
                    locale === o.k ? "bg-white text-ink shadow-card" : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </Surface>
      </Section>

      <Section title="Danger zone">
        <Surface className="border-danger/25 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">Delete everything</p>
              <p className="mt-0.5 max-w-[60ch] text-[11px] leading-4 text-ink-faint">
                Signs you out and clears {campaigns === 1 ? "the campaign" : `all ${campaigns} campaigns`}, every
                read, every plan and every conversation from this browser. It cannot be undone.
              </p>
            </div>
            <Btn variant="danger" size="sm" onClick={() => setConfirming(true)}>
              <Trash size={13} weight="bold" aria-hidden />
              Delete everything
            </Btn>
          </div>
        </Surface>
      </Section>
        </>
      )}

      {/* Autonomy, which used to be its own destination in the rail. It
          is a preference about how HeyMoon behaves, so it is a tab here
          rather than a row beside the work. */}
      {tab === "autonomy" && <AutonomyView />}

      {/* Asked once, in its own sheet, with the count in it. A confirm
          that does not say what is about to go is not a confirm. */}
      <Sheet open={confirming} onClose={() => setConfirming(false)} labelledBy="delete-title">
        <div className="p-6">
          <h2 id="delete-title" className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
            Delete everything?
          </h2>
          <p className="mt-2 text-body leading-5 text-ink-soft">
            {campaigns === 1 ? "One campaign" : `${campaigns} campaigns`}, with their reads, plans and
            conversations, and the account that built them. This browser will be back to a blank HeyMoon, and there
            is no undo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn
              variant="danger"
              onClick={() => { resetAll(); setConfirming(false); }}
            >
              Yes, delete everything
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirming(false)}>Keep it</Btn>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
