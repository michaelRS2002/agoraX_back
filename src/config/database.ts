/**
 * Database compatibility shim module.
 * 
 * @module config/database
 * @description Provides a compatibility layer for code that expects the legacy admin module API.
 * Exports Firebase Admin Auth client and Firestore instance with an interface compatible
 * with older code patterns where `admin.auth()` was called to get the Auth client.
 */

// Compatibility shim: export the Admin *auth client* as `admin`
// and Firestore as `firestore` so existing code using
// `import { admin } from './config/database'` continues to work.
import { adminAuth, db as firestore } from './firebase';

/**
 * Compatibility shim that mimics the Firebase Admin module API.
 * Provides an `auth()` method that returns the initialized Auth client.
 * 
 * @type {Object}
 * @property {Function} auth - Returns the Firebase Admin Auth instance
 * 
 * @example
 * ```typescript
 * import { admin } from './config/database';
 * 
 * // Verify a Firebase ID token
 * const decodedToken = await admin.auth().verifyIdToken(idToken);
 * ```
 */
const admin = {
	auth: () => adminAuth,
};

/**
 * Exported Firebase Admin Auth client instance.
 * @type {admin.auth.Auth}
 */
export { admin, firestore };

export default admin;