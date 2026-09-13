/* The HeyMoon.AI wordmark.
 *
 * Set in the product's own type rather than shipped as art, and that is
 * a stopgap with a reason. The file this replaced, `public/logo.svg`,
 * draws "MOONTech" as vector outlines: renaming the brand cannot be
 * done by editing paths, it needs a mark from design. Until that
 * arrives, a wordmark that says the right name in the right typeface
 * beats a picture that says the wrong one.
 *
 * Two upsides while it stands in: it inherits the interface font, so it
 * never loads a second one, and it is text, so it is selectable,
 * searchable and read correctly aloud without an `alt` that has to be
 * kept in sync with the picture.
 *
 * `.AI` carries the brand colour because the eyebrow and the credit
 * line say "HeyMoon.AI" while running copy says "HeyMoon" — the tint is
 * what makes the suffix read as part of the mark rather than as a
 * sentence that got cut off.
 */

const SIZE = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[19px]",
} as const;

export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      /* `ltr` because a brand name is not translated and not mirrored:
         in the Arabic build the mark still reads left to right. */
      dir="ltr"
      className={`inline-block select-none whitespace-nowrap font-semibold leading-none tracking-[-0.03em] text-ink ${SIZE[size]} ${className}`}
    >
      HeyMoon<span className="text-brand">.AI</span>
    </span>
  );
}
