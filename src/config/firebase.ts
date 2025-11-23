import dotenv from 'dotenv';
import admin from 'firebase-admin';
import fs from 'fs';

// Ensure .env is loaded early so service account env vars are available
dotenv.config();

// Support separate service account JSON for Auth and for DB (multi-project setup).
// env vars supported (prefer explicit ones):
// - FIREBASE_AUTH_SERVICE_ACCOUNT_JSON (stringified JSON) -> project used to verify idTokens
// - FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_DB_SERVICE_ACCOUNT_JSON (stringified JSON) -> project used for Firestore

// Supported inputs for service accounts (priority order):
// 1. FILE path env: FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_AUTH_SERVICE_ACCOUNT_PATH
// 2. BASE64 env: FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 / FIREBASE_AUTH_SERVICE_ACCOUNT_JSON_BASE64
// 3. JSON string env: FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_AUTH_SERVICE_ACCOUNT_JSON
const authRaw = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_JSON;
const dbRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_DB_SERVICE_ACCOUNT_JSON;

const authBase64 = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_JSON_BASE64;
const dbBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 || process.env.FIREBASE_DB_SERVICE_ACCOUNT_JSON_BASE64;

const authPath = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_PATH;
const dbPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_DB_SERVICE_ACCOUNT_PATH;

function readServiceAccount({ raw, base64, filePath }: { raw?: string | undefined; base64?: string | undefined; filePath?: string | undefined }) {
  // 1) File path
  if (filePath) {
    try {
      const contents = fs.readFileSync(filePath, { encoding: 'utf8' });
      return JSON.parse(contents);
    } catch (e) {
      throw new Error(`Could not read or parse service account file at ${filePath}: ${String(e)}`);
    }
  }

  // 2) base64
  if (base64) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      throw new Error('FIREBASE_*_SERVICE_ACCOUNT_JSON_BASE64 contains invalid base64 or JSON');
    }
  }

  // 3) raw JSON string (may be single-quoted in some .env files)
  if (raw) {
    let candidate = raw.trim();
    if ((candidate.startsWith("'") && candidate.endsWith("'")) || (candidate.startsWith('"') && candidate.endsWith('"'))) {
      candidate = candidate.slice(1, -1);
    }
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // if it's already an object in process.env (unlikely), return it; otherwise raise
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON');
    }
  }

  return null;
}

let authApp: admin.app.App | null = null;
let dbApp: admin.app.App | null = null;
// Diagnostics: record how each app was initialized (file|base64|json|none)
let dbInitMethod: 'file' | 'base64' | 'json' | 'none' = 'none';
let authInitMethod: 'file' | 'base64' | 'json' | 'none' = 'none';
let dbProjectId: string | null = null;
let authProjectId: string | null = null;

if (dbRaw || dbBase64 || dbPath) {
  const dbSA = readServiceAccount({ raw: dbRaw, base64: dbBase64, filePath: dbPath });
  if (!dbSA) throw new Error('No valid Firebase DB service account provided');
  if (dbPath) dbInitMethod = 'file';
  else if (dbBase64) dbInitMethod = 'base64';
  else dbInitMethod = 'json';
  dbProjectId = (dbSA && (dbSA as any).project_id) || null;
  dbApp = admin.initializeApp({ credential: admin.credential.cert(dbSA) }, 'dbApp');
}

if (authRaw || authBase64 || authPath) {
  const authSA = readServiceAccount({ raw: authRaw, base64: authBase64, filePath: authPath });
  if (!authSA) throw new Error('No valid Firebase Auth service account provided');
  if (authPath) authInitMethod = 'file';
  else if (authBase64) authInitMethod = 'base64';
  else authInitMethod = 'json';
  authProjectId = (authSA && (authSA as any).project_id) || null;
  authApp = admin.initializeApp({ credential: admin.credential.cert(authSA) }, 'authApp');
}

// Fallback: if neither explicit apps were created, attempt to load DB/service account with any supported input
if (!authApp && !dbApp) {
  const sa = readServiceAccount({ raw: process.env.FIREBASE_SERVICE_ACCOUNT_JSON, base64: process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, filePath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
  if (!sa) {
    throw new Error('No Firebase service account JSON found for initialization');
  }
  // determine method
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) dbInitMethod = authInitMethod = 'file';
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) dbInitMethod = authInitMethod = 'base64';
  else dbInitMethod = authInitMethod = 'json';
  dbProjectId = authProjectId = (sa && (sa as any).project_id) || null;
  const defaultApp = admin.initializeApp({ credential: admin.credential.cert(sa) });
  authApp = defaultApp;
  dbApp = defaultApp;
}

// If only dbApp exists, use it for auth verification as well (single-project setup)
if (!authApp && dbApp) authApp = dbApp;
// If only authApp exists, use it for Firestore as well
if (!dbApp && authApp) dbApp = authApp;

// Export helpers: adminAuth (auth client for verifying idTokens) and db (Firestore)
export const adminAuth = admin.auth(authApp!);
export const db = admin.firestore(dbApp!);
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // ignore if SDK/version doesn't support this call in the current environment
  // (defensive; setting is optional but helpful to avoid Firestore rejecting undefined fields)
  // eslint-disable-next-line no-console
  console.warn('Could not apply Firestore settings ignoreUndefinedProperties:', e);
}

export { admin };

// Expose safe diagnostic info (DO NOT expose private_key)
export const firebaseInitInfo = {
  db: { method: dbInitMethod, projectId: dbProjectId },
  auth: { method: authInitMethod, projectId: authProjectId },
};
