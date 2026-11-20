# Aibee Visuals — studio website + dashboard

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · GSAP · Motion (Framer Motion) · React Three Fiber · Lenis · Firebase · Cloudinary · Paystack · Vercel.

## Run it

```bash
bun install
bun run dev        # http://localhost:3000  ·  dashboard at /admin
```

Production build (needs Node.js 20+): `npm run build` then `npm start`. Also: `bun run lint`, `bun run typecheck`.

## The dashboard (`/admin`)

Sign in at **/admin** with the `ADMIN_PASSWORD` from `.env.local` (or Google, once Firebase is connected
and your email is in `NEXT_PUBLIC_ADMIN_EMAILS`). Works on phone and desktop.

| Section | What you manage |
| --- | --- |
| **Projects** | One project per brand: name, title, category, year, summary, services, accent colour, featured / hidden. Upload **designs, logos, illustrations and motion** (images and videos, drag-and-drop, several at once). Set the cover, captions, order; drag projects to reorder the site. |
| **Hero** | The images riding the homepage arc. Pick from your library or upload new ones; drag to reorder. |
| **Brands** | Logos in the “Brands we’ve helped move forward” strip (transparent PNG/SVG; shown white on dark). |
| **Motion** | Logo animations, motion graphics and videos; mark pieces for the homepage reel. Poster frames are grabbed automatically. |
| **Briefs** | Every brief sent from the “Start a project” form. |

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

## Going live (Vercel + Firebase + Cloudinary)

1. **Firebase** → create a project, enable **Firestore**, and (optional) **Authentication → Google**.
   - Project settings → Service accounts → *Generate new private key* → `FIREBASE_PROJECT_ID`,
     `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
   - For Google sign-in also add the web app config (`NEXT_PUBLIC_FIREBASE_*`).
   - Deploy the locked-down rules: `firebase deploy --only firestore:rules`.
2. **Cloudinary** → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   Uploads go straight from your browser to Cloudinary (large videos are fine).
3. **Dashboard login** → `ADMIN_PASSWORD` and a long random `ADMIN_SESSION_SECRET`.
4. Push to GitHub, import in **Vercel**, paste the variables from `.env.example`, deploy.
   Set `NEXT_PUBLIC_SITE_URL` to your domain.

## How project briefs reach you

1. **WhatsApp (works now):** the brief form opens WhatsApp with the full brief addressed to
   **024 083 2129** — the client just taps send. A copy is kept for the dashboard’s **Briefs** page.
2. **Automatic WhatsApp alert (optional):** add the `WHATSAPP_*` keys (Meta WhatsApp Cloud API).
3. **Paystack (optional):** `PAYSTACK_SECRET_KEY` enables the paid discovery-session booking after a brief.

## Where things are

| Area | Files |
| --- | --- |
| Dashboard UI | `src/components/admin/` · server actions in `src/app/admin/actions.ts` |
| Content model, starter content, storage | `src/lib/content/` |
| Media URLs + uploads | `src/lib/media/`, `src/app/api/admin/media`, `src/app/api/media` |
| Contact details / services / process | `src/content/contact.ts`, `src/content/site.ts` |
| Homepage sections | `src/components/sections/` (hero scene in `src/components/hero/`) |
| Project pages, archive, motion page | `src/app/work/`, `src/app/motion/`, `src/components/work/`, `src/components/motion/` |
