// This file now delegates to `config/firebase.ts`. Keep it as a compatibility
// shim so any import of `config/database` still gets a Firestore instance.
import { admin, db as firestore } from './firebase';

export { admin, firestore };

export default admin;