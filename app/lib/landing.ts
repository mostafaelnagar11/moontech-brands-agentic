/* What the landing page shows of real people, and the gate it passed.
 *
 * Every photograph on the landing is a real post by a creator in the
 * demo store's matched pool, and every one of them was looked at before
 * it was listed here. The gate: no burned-in captions or subtitles, no
 * third-party mastheads, logos or awards, no app chrome, nothing that
 * is a magazine cover or a screenshot, and at least 360px wide. Files
 * that failed it are named below so nobody re-adds them by accident.
 *
 * Handles are the folder names under public/creators and match the
 * roster's `handle` without the @. Positions are for object-position on
 * a 4:5 or 1:1 crop of a 3:4 or 9:16 source.
 */

export interface Frame {
  handle: string;
  src: string;
  position: string;
}

/** Beside the written guarantee: one real campaign post, a product in
    someone's hand. It is here as a picture of the WORK, not of a person
    to browse: HeyMoon sells guaranteed sales, not access to creators,
    so the page shows what a campaign looks like and never a roster. */
export const AD_PHOTO: Frame = { handle: "jawahralsuwaidi", src: "/creators/jawahralsuwaidi/p1.jpg", position: "50% 15%" };

/** Product squares, cropped once from real posts (see public/products).
    Only two of the demo store's bestsellers have an honest photo in the
    fixtures; the others get no picture rather than a wrong one. */
export const PRODUCT_SQUARES: Record<string, string> = {
  "Structured Leather Tote": "/products/structured-leather-tote.jpg",
  "Pearl Mesh Clutch": "/products/pearl-mesh-clutch.jpg",
};

/* Failed the gate and must not be used on the landing:
   jawahralsuwaidi p2 (third-party product post) p5; olafarahat p2 (a
   magazine cover) p3 (crowd); makeupbymemz p1 p2 p3 p5 (video frames);
   ghalya.mu2 p1 (balloons, busy) p2 (an awards stage with a logo) p3 p4;
   rebeccarkassab p1 (a magazine spread) p2 p5 (a hotel's name over the
   door); paola.elsitt p3 p4 p5; mais.mustafa p1 to p5 (every post carries
   a caption); every file under public/ads (app chrome). */

/** Market codes as the short names a brand actually uses. */
export const SHORT_MARKET: Record<string, string> = {
  AE: "UAE", SA: "KSA", KW: "Kuwait", QA: "Qatar", BH: "Bahrain", OM: "Oman",
};
