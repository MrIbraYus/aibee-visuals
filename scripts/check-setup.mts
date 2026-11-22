/**
 * Checks that Firebase and Cloudinary are set up correctly for the site and
 * dashboard. Safe to run any time: the test document and test upload it
 * makes are deleted straight away.
 *
 *   npm run setup:check
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { v2 as cloudinary } from "cloudinary";

const env = process.env;
let failures = 0;
let warnings = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const bad = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg: string) => {
  warnings++;
  console.log(`  ! ${msg}`);
};
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 200);

/* ----------------------------- environment ----------------------------- */
console.log("\nEnvironment variables");
const required = [
  "NEXT_PUBLIC_SITE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "ADMIN_SESSION_SECRET",
];
for (const key of required) (env[key] ? ok : bad)(`${key} ${env[key] ? "is set" : "is missing"}`);
const optional = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "NEXT_PUBLIC_ADMIN_EMAILS"];
const googleReady = optional.every((k) => env[k]);
(googleReady ? ok : warn)(googleReady ? "Google sign-in variables are set" : `Google sign-in needs: ${optional.filter((k) => !env[k]).join(", ")}`);
if (env.ADMIN_PASSWORD) warn("ADMIN_PASSWORD is set, so it overrides the PIN saved in Firebase");
if (env.NEXT_PUBLIC_SITE_URL && !env.NEXT_PUBLIC_SITE_URL.startsWith("https://")) warn("NEXT_PUBLIC_SITE_URL should be your live https:// address");

/* ------------------------------- Firebase ------------------------------ */
console.log("\nFirebase");
const cloudinaryUrls = new Set<string>();
const collect = (value: unknown) => {
  JSON.stringify(value, (_k, v) => {
    if (typeof v === "string" && v.startsWith("cloudinary:")) cloudinaryUrls.add(v.slice("cloudinary:".length));
    return v;
  });
};

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    const app = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID.trim(),
        clientEmail: env.FIREBASE_CLIENT_EMAIL.trim(),
        privateKey: env.FIREBASE_PRIVATE_KEY.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      }),
    });
    const db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });

    const [meta, admin, projects, brands, websites, testimonials, inquiries, subs] = await Promise.all([
      db.doc("site/meta").get(),
      db.doc("site/admin").get(),
      db.collection("projects").get(),
      db.doc("site/brands").get(),
      db.doc("site/websites").get(),
      db.doc("site/testimonials").get(),
      db.collection("inquiries").where("status", "==", "new").count().get(),
      db.collection("pushSubscriptions").count().get(),
    ]);
    ok("Service-account key works (connected to Firestore)");
    (meta.exists ? ok : warn)(meta.exists ? "Dashboard content is stored in Firestore" : "No content saved yet: the site shows the bundled content until your first dashboard save");
    (admin.data()?.pinHash ? ok : bad)(admin.data()?.pinHash ? `Dashboard PIN is saved (${admin.data()?.pinLength} digits)` : "No dashboard PIN saved: run npm run admin:pin -- 1234");
    ok(
      `Content: ${projects.size} projects, ${(brands.data()?.items ?? []).length} brands, ${(websites.data()?.items ?? []).length} websites, ${(testimonials.data()?.items ?? []).length} testimonials`,
    );
    ok(`Messages: ${inquiries.data().count} unread · ${subs.data().count} device(s) with notifications on`);
    projects.docs.forEach((d) => collect(d.data()));
    collect(brands.data());
    collect(websites.data());
    collect(testimonials.data());

    // Write → read → delete (with an empty optional field, like the dashboard sends)
    const probe = db.collection("_setupCheck").doc("probe");
    await probe.set({ at: Date.now(), optional: undefined, ok: true });
    const back = await probe.get();
    await probe.delete();
    (back.data()?.ok ? ok : bad)("Saving works (test document written, read back and deleted)");
  } catch (e) {
    bad(`Firebase Admin error: ${errText(e)}`);
  }

  // Security rules: the public web key must NOT be able to read the database directly.
  if (env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/site/admin?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      );
      if (res.status === 403) ok("Security rules block public access to the database");
      else if (res.ok) bad("Security rules are OPEN: anyone can read your database. Run: firebase deploy --only firestore:rules");
      else warn(`Couldn't check security rules (HTTP ${res.status})`);
    } catch (e) {
      warn(`Couldn't check security rules: ${errText(e)}`);
    }
  }
} else {
  bad("Firebase Admin keys are missing, so the live dashboard would be read-only");
}

/* ------------------------------ Cloudinary ----------------------------- */
console.log("\nCloudinary");
const cloudName = env.CLOUDINARY_CLOUD_NAME ?? env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
if (cloudName && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({ cloud_name: cloudName, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  try {
    await cloudinary.api.ping();
    ok("API key and secret are valid");
  } catch (e) {
    bad(`Cloudinary rejected the keys: ${errText(e)}`);
  }

  // Exactly what the dashboard does: a browser-style signed upload, then delivery, then delete.
  try {
    const params = { timestamp: String(Math.round(Date.now() / 1000)), asset_folder: "aibee" };
    const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const form = new FormData();
    Object.entries({ ...params, api_key: env.CLOUDINARY_API_KEY, signature }).forEach(([k, v]) => form.append(k, v));
    form.append("file", new Blob([png], { type: "image/png" }), "setup-check.png");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: form });
    const body = (await res.json()) as { public_id?: string; error?: { message: string } };
    if (!res.ok || !body.public_id) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
    ok("Dashboard uploads work (signed test upload accepted)");
    const delivered = await fetch(`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,c_limit,w_640,q_auto/${body.public_id}`);
    (delivered.ok ? ok : bad)(delivered.ok ? "Optimised image delivery works" : `Image delivery failed (HTTP ${delivered.status})`);
    await cloudinary.uploader.destroy(body.public_id);
    ok("Test upload deleted");
  } catch (e) {
    bad(`Upload test failed: ${errText(e)}`);
  }

  // Every Cloudinary image or video the site currently uses.
  if (cloudinaryUrls.size) {
    let missing = 0;
    await Promise.all(
      [...cloudinaryUrls].map(async (id) => {
        const [img, vid] = await Promise.all([
          fetch(`https://res.cloudinary.com/${cloudName}/image/upload/w_64/${id}`, { method: "HEAD" }),
          fetch(`https://res.cloudinary.com/${cloudName}/video/upload/${id}.mp4`, { method: "HEAD" }),
        ]);
        if (!img.ok && !vid.ok) {
          missing++;
          console.log(`    missing: ${id}`);
        }
      }),
    );
    (missing ? bad : ok)(missing ? `${missing} of ${cloudinaryUrls.size} files used on the site are missing` : `All ${cloudinaryUrls.size} Cloudinary files used on the site load`);
  }
} else {
  bad("Cloudinary keys are missing, so dashboard uploads won't work");
}

console.log(`\n${failures ? `✗ ${failures} problem(s)` : "✓ Everything is set up"}${warnings ? ` · ${warnings} note(s)` : ""}\n`);
process.exit(failures ? 1 : 0);
