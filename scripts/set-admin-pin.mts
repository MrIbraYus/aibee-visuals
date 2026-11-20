/**
 * Saves the dashboard PIN to Firebase (as a salted hash) so /admin works on the
 * live site without any extra hosting settings.
 *
 *   npm run admin:pin -- 5588        # set a specific PIN/password
 *   npm run admin:pin                # use ADMIN_PASSWORD from .env.local
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const pin = (process.argv[2] ?? process.env.ADMIN_PASSWORD ?? "").trim();
if (pin.length < 4) {
  console.error("Give a PIN of at least 4 characters: npm run admin:pin -- 5588");
  process.exit(1);
}
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Add the Firebase Admin keys to .env.local first.");
  process.exit(1);
}
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const salt = randomBytes(16);
const hash = await scryptAsync(pin, salt, 32);

const app = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
  }),
});
await getFirestore(app)
  .doc("site/admin")
  .set(
    {
      pinHash: `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`,
      pinLength: pin.length,
      pinNumeric: /^\d+$/.test(pin),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
console.log(`✓ Dashboard PIN saved to Firebase (${pin.length} characters).`);
process.exit(0);
