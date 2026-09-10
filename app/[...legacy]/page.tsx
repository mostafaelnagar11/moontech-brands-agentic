/* Bookmarks from the old app.

   Every screen this product used to have — the dashboard, the ads
   queue, the inbox, the proposal, a phase, a read — is now a view
   inside the one panel at /c, so none of those paths resolve any more.
   A stakeholder who kept a link should land in the application rather
   than on a 404, so anything that is not the front door or the
   application is sent to the application.

   This is a catch-all, which the App Router ranks BELOW every static
   segment: `/` is matched by app/page.tsx and `/c` by app/c/page.tsx
   before this file is ever considered. A required catch-all also never
   matches the root path — only `[[...legacy]]` would — so the landing
   page is safe from it twice over. */

import { redirect } from "next/navigation";

export default function Legacy() {
  redirect("/c");
}
