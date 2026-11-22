# Aibee Visuals — studio website + dashboard

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · GSAP · Motion (Framer Motion) · React Three Fiber · Lenis · Firebase · Cloudinary · Paystack · Vercel.

## Run it

```bash
bun install
bun run dev        # http://localhost:3000  ·  dashboard at /admin
```

Production build (needs Node.js 20+): `npm run build` then `npm start`. Also: `bun run lint`, `bun run typecheck`.

**Check Firebase and Cloudinary:** `npm run setup:check` tests your keys, saving to Firestore, the
security rules, the dashboard PIN, a real signed upload to Cloudinary (deleted afterwards) and every
Cloudinary file the site uses.

## The dashboard (`/admin`)

Sign in at **/admin** with your **PIN** — it's stored (hashed) in Firebase, so it works on the live site
with no extra settings. Change it any time with `npm run admin:pin -- 1234`. After 5 wrong tries a device
is locked out for 15 minutes. Google sign-in also works for the email in `NEXT_PUBLIC_ADMIN_EMAILS`.

| Section | What you manage |
| --- | --- |
| **Projects** | One project per brand: name, title, category, year, summary, services, accent colour, featured / hidden. Upload **designs, logos, illustrations and motion** (images and videos, drag-and-drop, several at once). Set the cover, captions, order; drag projects to reorder the site. |
| **Hero** | The images riding the homepage arc. Pick from your library or upload new ones; drag to reorder. |
| **Brands** | Logos in the “Brands we’ve helped move forward” strip (transparent PNG/SVG; shown white on dark). |
| **Websites** | Sites you've designed or built: hero screenshot, name, web address, description, tags and year. Drag to reorder; switch any off. They stack above the section's “Your website could be next” card. |
| **Motion** | Logo animations, motion graphics and videos; mark pieces for the homepage reel. Poster frames are grabbed automatically. |
| **Testimonials** | Client quotes with name, role and an optional photo. The homepage section appears once one is live. |
| **Messages** | Everything sent from the website's message form, with an unread badge. Reply on WhatsApp, by email or call in one tap. |

Every save updates the live site immediately — the homepage, `/work`, each brand page at
`/work/<link>` (with Designs / Logos / Illustrations / Motion tabs) and `/motion`.

### Where content is stored

| Mode | When | Content | Uploads |
| --- | --- | --- | --- |
| **Local** | on your computer without keys | `.data/content.json` | `.data/uploads/` |
| **Live** | Firebase + Cloudinary keys set | Firestore (`projects`, `site/*`) | Cloudinary (auto-optimised images & video) |
| **Read-only** | hosted without keys | starter content only — the dashboard shows a notice | — |

The first save copies the starter content (in `src/lib/content/seed.ts`) into the database, then the
dashboard is the single source of truth. Local mode is for trying things out — to manage the
deployed site, connect Firebase and Cloudinary (below).

## Deploying on Vercel

Your GitHub repo has the site inside the **`aibee-visuals/`** folder, so:

1. **Publish your dashboard content** (moves local uploads to Cloudinary and bakes the content into the site):
   ```bash
   npm run content:publish
   ```
   Commit the updated `src/content/published.json` (and push).
2. In Vercel → **Add New → Project** → import `aibee-visuals` from GitHub.
   - **Root Directory:** `aibee-visuals`
   - Framework preset: **Next.js** (build command and output are detected automatically).
3. **Environment variables** → paste everything from your `.env.local`
   (Project → Settings → Environment Variables, “Production” + “Preview”).
   You don't need `ADMIN_PASSWORD` there — the dashboard PIN lives in Firebase.
4. **Deploy.** Then set your domain and change `NEXT_PUBLIC_SITE_URL` to it.

### Make the live dashboard editable

Without Firebase Admin keys the deployed site shows your published content, and `/admin` on the
live site is read-only. To edit from anywhere:

1. Firebase console → Project settings → **Service accounts → Generate new private key**.
2. Put `client_email` → `FIREBASE_CLIENT_EMAIL` and `private_key` → `FIREBASE_PRIVATE_KEY`
   (in `.env.local` **and** in Vercel), then redeploy.
3. Run `npm run content:publish` once more — it copies your content into Firestore.
4. Optional: `firebase deploy --only firestore:rules` to lock the database to the server.

Uploads already go to **Cloudinary** (images and videos are optimised automatically).

## How messages reach you

Visitors either **send a message** (name, email or phone, message) or tap **WhatsApp** to chat
with **024 083 2129** directly.

1. **Dashboard inbox:** every message lands in **/admin → Messages** (unread badge, and the browser
   tab shows the count while the dashboard is open).
2. **Notifications on your phone/computer:** in **Messages**, tap **Turn on notifications** on each
   device you want alerts on. Alerts arrive even when the dashboard is closed. No setup needed: the
   keys are created automatically and kept in Firebase. On iPhone, first add the site to your Home
   Screen (Share → Add to Home Screen), open it from there, then turn notifications on.
3. **Automatic WhatsApp alert (optional):** add the `WHATSAPP_*` keys (Meta WhatsApp Cloud API).

The Paystack routes are still in the code (`src/app/api/paystack`) but no longer used by the site.

## Where things are

| Area | Files |
| --- | --- |
| Dashboard UI | `src/components/admin/` · server actions in `src/app/admin/actions.ts` |
| Message form, panel, notifications | `src/components/contact/`, `src/app/api/inquiries`, `src/lib/server/push.ts`, `public/sw.js` |
| Hero "what we do" pills | list in `src/content/site.ts` (`whatWeDo`), component `src/components/hero/ServicePills.tsx` |
| Content model, starter content, storage | `src/lib/content/` |
| Media URLs + uploads | `src/lib/media/`, `src/app/api/admin/media`, `src/app/api/media` |
| Contact details / services / process | `src/content/contact.ts`, `src/content/site.ts` |
| Homepage sections | `src/components/sections/` (hero scene in `src/components/hero/`) |
| Project pages, archive, motion page | `src/app/work/`, `src/app/motion/`, `src/components/work/`, `src/components/motion/` |
