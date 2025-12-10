/**
 * Firebase Admin SDK configuration module.
 * 
 * @module config/firebase
 * @description Initializes Firebase Admin SDK with support for multiple service account configurations.
 * Provides flexible authentication options via file paths, base64-encoded JSON, or direct JSON strings.
 * Supports separate Firebase projects for authentication and database operations (multi-project setup).
 * 
 * Environment variable priority:
 * 1. File path (FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_AUTH_SERVICE_ACCOUNT_PATH)
 * 2. Base64 encoded (FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 / FIREBASE_AUTH_SERVICE_ACCOUNT_JSON_BASE64)
 * 3. JSON string (FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_AUTH_SERVICE_ACCOUNT_JSON)
 */

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

/**
 * Reads and parses a Firebase service account credential from various sources.
 * 
 * @function readServiceAccount
 * @param {Object} options - Configuration options
 * @param {string} [options.raw] - Raw JSON string of the service account
 * @param {string} [options.base64] - Base64-encoded JSON string
 * @param {string} [options.filePath] - File system path to service account JSON file
 * @returns {Object|null} Parsed service account object or null if none provided
 * @throws {Error} If file cannot be read, base64 is invalid, or JSON parsing fails
 * 
 * @description
 * Attempts to load credentials in this order:
 * 1. File path - reads and parses JSON from filesystem
 * 2. Base64 - decodes and parses base64-encoded JSON
 * 3. Raw JSON - parses JSON string directly (handles single/double quotes)
 * 
 * @example
 * ```typescript
 * const sa = readServiceAccount({
 *   filePath: './serviceAccount.json'
 * });
 * ```
 */
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

/**
 * Re-export of Firebase Admin SDK for compatibility.
 * @type {admin}
 */
export { admin };

/**
 * Diagnostic information about Firebase initialization.
 * Useful for debugging which configuration method was used.
 * @type {Object}
 * @property {Object} db - Database initialization info
 * @property {string} db.method - How DB was initialized: 'file', 'base64', 'json', or 'none'
 * @property {string|null} db.projectId - Firebase project ID for database
 * @property {Object} auth - Authentication initialization info
 * @property {string} auth.method - How Auth was initialized: 'file', 'base64', 'json', or 'none'
 * @property {string|null} auth.projectId - Firebase project ID for authentication
 */
export const firebaseInitInfo = {
  db: { method: dbInitMethod, projectId: dbProjectId },
  auth: { method: authInitMethod, projectId: authProjectId },
};
