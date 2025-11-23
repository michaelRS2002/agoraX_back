// Compatibility shim: export the Admin *auth client* as `admin`
// and Firestore as `firestore` so existing code using
// `import { admin } from './config/database'` continues to work.
import { adminAuth, db as firestore } from './firebase';

// Create a small shim that mimics the old `admin` module API where callers
// use `admin.auth()` to get the Auth client. `adminAuth` is already an Auth
// instance (admin.auth(app)), so we expose an object with an `auth()` method.
const admin = {
	auth: () => adminAuth,
};

export { admin, firestore };

export default admin;