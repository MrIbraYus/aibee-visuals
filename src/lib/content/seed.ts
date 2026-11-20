import type { Asset, AssetType, Brand, Media, Project, SiteContent } from "./types";

/**
 * Starter content: the work that ships with the site. On first save from
 * /admin it is copied into your database, after which the dashboard is the
 * single source of truth.
 */

const T0 = 1_790_000_000_000; // fixed timestamps keep builds deterministic

const img = (url: string, width = 1600, height = 2000): Media => ({ url, kind: "image", width, height });

let seq = 0;
function asset(type: AssetType, media: Media, extra: Partial<Asset> = {}): Asset {
  seq += 1;
  return { id: `seed${String(seq).padStart(3, "0")}`, type, media, createdAt: T0 + seq * 1000, ...extra };
}

let heroSeq = 0;
const hero = () => ({ hero: true, heroOrder: heroSeq++ });

function project(p: Omit<Project, "createdAt" | "updatedAt" | "published" | "featured"> & Partial<Project>): Project {
  return { published: true, featured: false, createdAt: T0, updatedAt: T0, ...p };
}

export function seedContent(): SiteContent {
  seq = 0;
  heroSeq = 0;
  const projects: Project[] = [
    project({
      id: "campusride",
      slug: "campusride",
      client: "CampusRide",
      title: "Ride together. Save together.",
      category: "Brand Identity",
      year: "2026",
      summary:
        "Identity, app touchpoints and the launch campaign for a student ride-sharing app — two figures moving as one, real campus locations and a price point students remember.",
      services: ["Logo design", "Brand identity", "Campaign", "App UI"],
      accent: "#1c7a3e",
      featured: true,
      order: 0,
      assets: [
        asset("design", img("/portfolio/campusride/ride-together.webp", 2160, 2700), { title: "Launch campaign", ...hero() }),
        asset("logo", img("/portfolio/campusride/logo-rationale.webp"), { title: "Logo & rationale" }),
        asset("design", img("/portfolio/campusride/share-the-ride.webp", 2160, 2700), { title: "Share the ride", ...hero() }),
        asset("design", img("/portfolio/campusride/students.webp", 2160, 2700), { title: "Made for students", ...hero() }),
        asset("design", img("/portfolio/campusride/splash-screen.webp", 1600, 2844), { title: "App splash screen" }),
      ],
    }),
    project({
      id: "urbandrop",
      slug: "urbandrop",
      client: "UrbanDrop",
      title: "Shop local. Go global.",
      category: "Social Media",
      year: "2025",
      summary:
        "A merchant-first content system for UrbanDrop: friendly greens, confident type and templates merchants can use every single day — from daily tips to national moments.",
      services: ["Content system", "Social design", "Campaigns"],
      accent: "#3fae49",
      featured: true,
      order: 1,
      assets: [
        asset("design", img("/portfolio/urbandrop/merchant-checklist.webp", 2160, 2700), { title: "Merchant daily checklist", ...hero() }),
        asset("design", img("/portfolio/urbandrop/stronger-together.webp", 2160, 2700), { title: "Pink October", ...hero() }),
        asset("design", img("/portfolio/urbandrop/nigeria-independence.webp"), { title: "Nigeria Independence Day", ...hero() }),
      ],
    }),
    project({
      id: "royal-empire",
      slug: "boako-party-in-the-park",
      client: "Royal Empire Entertainment",
      title: "Boako Party in the Park.",
      category: "Campaign",
      year: "2026",
      summary:
        "A bold, collectible artist series for a hometown festival — one system, a poster per headliner, built to sell tickets and live on every timeline.",
      services: ["Event campaign", "Artist posters", "Ticketing assets"],
      accent: "#e3262f",
      featured: true,
      order: 2,
      assets: [
        asset("design", img("/portfolio/royal-empire/boako-youthgod.webp", 1600, 2200), { title: "Youthgod", ...hero() }),
        asset("design", img("/portfolio/royal-empire/boako-kente-marley.webp", 1600, 2200), { title: "Kente Marley", ...hero() }),
        asset("design", img("/portfolio/royal-empire/boako-lami-jnr.webp", 1600, 2200), { title: "Lami Jnr", ...hero() }),
        asset("design", img("/portfolio/royal-empire/xmass-float.webp"), { title: "X'mass Float" }),
      ],
    }),
    project({
      id: "happy-african-market",
      slug: "happy-african-market",
      client: "Happy African Market",
      title: "Fresh picks, ready for your kitchen.",
      category: "Social Media",
      year: "2026",
      summary:
        "Appetising, conversion-ready social content for an African grocery store — product drops, restocks and milestones in one warm, recognisable look.",
      services: ["Social design", "Product art direction", "Promotions"],
      accent: "#2fa84f",
      featured: true,
      order: 3,
      assets: [
        asset("design", img("/portfolio/happy-african-market/fresh-picks.webp"), { title: "Fresh picks", ...hero() }),
        asset("design", img("/portfolio/happy-african-market/puna-yam.webp"), { title: "Puna yam drop" }),
        asset("design", img("/portfolio/happy-african-market/prekese.webp"), { title: "Prekese restock", ...hero() }),
        asset("design", img("/portfolio/happy-african-market/anniversary.webp"), { title: "One year anniversary" }),
      ],
    }),
    project({
      id: "omnivest",
      slug: "omnivest-study-abroad",
      client: "Omnivest",
      title: "Study abroad, made simple.",
      category: "Campaign",
      year: "2026",
      summary: "An intake campaign for an education consultancy — clear destinations, real students and a single call to action.",
      services: ["Campaign design", "Social"],
      accent: "#d71f26",
      featured: true,
      order: 4,
      assets: [asset("design", img("/portfolio/omnivest/study-abroad.webp"), { title: "January intake" })],
    }),
    project({
      id: "opv",
      slug: "opv-all-black-party",
      client: "OPV",
      title: "All Black Party.",
      category: "Campaign",
      year: "2026",
      summary: "Chrome, grit and a strict dress code — a nightlife poster that sets the mood before the doors open.",
      services: ["Event poster", "Typography"],
      accent: "#f5c400",
      order: 5,
      assets: [asset("design", img("/portfolio/opv/all-black-party.webp", 1600, 2133), { title: "Annual All Black Party" })],
    }),
    project({
      id: "s-and-o",
      slug: "duayaw-nkwanta-home-coming",
      client: "S&O Geng",
      title: "Home Coming '26.",
      category: "Campaign",
      year: "2026",
      summary: "A loud, sunny first-edition homecoming poster with hand-built 3D lettering.",
      services: ["Event poster", "3D lettering"],
      accent: "#2a9df4",
      order: 6,
      assets: [asset("design", img("/portfolio/s-and-o/duayaw-nkwanta.webp"), { title: "Duayaw Nkwanta Home Coming" })],
    }),
    project({
      id: "aibee-studio",
      slug: "aibee-visuals",
      client: "Aibee Visuals",
      title: "The studio, in motion.",
      category: "Motion",
      year: "2026",
      summary: "Our own identity in motion — logo animations and experiments that show how we think about movement.",
      services: ["Logo animation", "Motion graphics"],
      accent: "#1261f5",
      order: 7,
      assets: [
        asset("motion", { url: "/portfolio/aibee/logo-animation.webm", kind: "video", width: 1280, height: 720, duration: 6, poster: "/portfolio/aibee/logo-animation-poster.webp" }, {
          title: "Aibee logo animation",
          motionKind: "Logo animation",
          reel: true,
        }),
      ],
    }),
  ];

  const brand = (id: string, name: string, order: number, logo?: Media): Brand => ({ id, name, order, logo });
  const brands: Brand[] = [
    brand("urbandrop", "UrbanDrop", 0, { url: "/brands/urbandrop.png", kind: "image", width: 766, height: 220 }),
    brand("mygotickets", "MyGoTickets", 1),
    brand("royal-empire", "Royal Empire", 2),
    brand("campusride", "CampusRide", 3, { url: "/brands/campusride.png", kind: "image", width: 977, height: 181 }),
    brand("bia", "Bia", 4),
    brand("happy-african-market", "Happy African Market", 5),
    brand("omnivest", "Omnivest", 6),
  ];

  return { projects, brands };
}
