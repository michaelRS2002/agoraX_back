import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Ensure .env is loaded early so FIREBASE_SERVICE_ACCOUNT_JSON is available
dotenv.config();

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set in environment');
}

let serviceAccount: any;
try {
  serviceAccount = JSON.parse(raw);
} catch (err) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export { admin, db };
