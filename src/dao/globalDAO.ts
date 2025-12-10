import { db } from '../config/firebase';

/**
 * Generic Data Access Object (DAO) for Firestore operations.
 * 
 * @class GlobalDAO
 * @description Provides a reusable abstraction layer for CRUD operations on Firestore collections.
 * This class implements the DAO pattern to separate data access logic from business logic.
 * Supports automatic timestamp conversion and flexible querying.
 * 
 * @example
 * ```typescript
 * // Create a DAO for the 'users' collection
 * const userDao = new GlobalDAO('users', 'id');
 * 
 * // Create a new user
 * const newUser = await userDao.create({ name: 'John', email: 'john@example.com' });
 * 
 * // Get all users
 * const allUsers = await userDao.getAll();
 * 
 * // Find user by email
 * const user = await userDao.findOneBy({ email: 'john@example.com' });
 * ```
 */
class GlobalDAO {
	/**
	 * The name of the Firestore collection this DAO operates on.
	 * @type {string}
	 */
	table: string;

	/**
	 * The name of the primary key field.
	 * @type {string}
	 * @default 'id'
	 */
	pk: string;

	/**
	 * Creates an instance of GlobalDAO.
	 * 
	 * @constructor
	 * @param {string} table - The name of the Firestore collection
	 * @param {string} [primaryKey='id'] - The primary key field name
	 * 
	 * @example
	 * ```typescript
	 * const meetingsDao = new GlobalDAO('meetings', 'id');
	 * ```
	 */
	constructor(table: string, primaryKey = 'id') {
		this.table = table;
		this.pk = primaryKey;
	}

	/**
	 * Normalizes a Firestore document snapshot into a plain JavaScript object.
	 * Converts Firestore Timestamps to ISO string format and includes the document ID.
	 * 
	 * @private
	 * @param {FirebaseFirestore.DocumentSnapshot} doc - The Firestore document snapshot
	 * @returns {any} A normalized object with id and converted timestamps
	 */
	private normalizeDoc(doc: FirebaseFirestore.DocumentSnapshot) {
		const data = doc.data() || {};
		const result: any = { id: doc.id, ...data };
		// convert Firestore Timestamps to ISO strings
		for (const key of Object.keys(result)) {
			const val: any = result[key];
			if (val && typeof val.toDate === 'function') {
				try {
					result[key] = val.toDate().toISOString();
				} catch {
					// leave as-is if conversion fails
				}
			}
		}
		return result;
	}

	/**
	 * Retrieves all documents from the collection.
	 * 
	 * @async
	 * @returns {Promise<any[]>} An array of all documents in the collection
	 * 
	 * @example
	 * ```typescript
	 * const allUsers = await userDao.getAll();
	 * console.log(allUsers); // [{ id: '1', name: 'John' }, ...]
	 * ```
	 */
	async getAll() {
		const snap = await db.collection(this.table).get();
		return snap.docs.map((d) => this.normalizeDoc(d));
	}

	/**
	 * Retrieves a single document by its ID.
	 * 
	 * @async
	 * @param {any} id - The document ID
	 * @returns {Promise<any | null>} The document data or null if not found
	 * 
	 * @example
	 * ```typescript
	 * const user = await userDao.getById('user123');
	 * if (user) {
	 *   console.log(user.name);
	 * }
	 * ```
	 */
	async getById(id: any) {
		const doc = await db.collection(this.table).doc(String(id)).get();
		if (!doc.exists) return null;
		return this.normalizeDoc(doc);
	}

	/**
	 * Creates a new document in the collection.
	 * Firestore auto-generates a unique document ID.
	 * 
	 * @async
	 * @param {any} payload - The data to store in the new document
	 * @returns {Promise<any>} The created document with its generated ID
	 * 
	 * @example
	 * ```typescript
	 * const newUser = await userDao.create({
	 *   name: 'Alice',
	 *   email: 'alice@example.com',
	 *   age: 28
	 * });
	 * console.log(newUser.id); // Auto-generated ID
	 * ```
	 */
	async create(payload: any) {
		const ref = await db.collection(this.table).add(payload);
		const doc = await ref.get();
		return this.normalizeDoc(doc);
	}

	/**
	 * Updates an existing document by its ID.
	 * Only updates the fields provided in the payload.
	 * 
	 * @async
	 * @param {any} id - The document ID to update
	 * @param {any} payload - The fields to update (partial update supported)
	 * @returns {Promise<any>} The updated document
	 * @throws {Error} If the document doesn't exist
	 * 
	 * @example
	 * ```typescript
	 * const updated = await userDao.update('user123', { age: 29 });
	 * console.log(updated.age); // 29
	 * ```
	 */
	async update(id: any, payload: any) {
		const docRef = db.collection(this.table).doc(String(id));
		await docRef.update(payload);
		const doc = await docRef.get();
		return this.normalizeDoc(doc);
	}

	/**
	 * Deletes a document by its ID.
	 * 
	 * @async
	 * @param {any} id - The document ID to delete
	 * @returns {Promise<{id: any}>} An object containing the deleted document's ID
	 * 
	 * @example
	 * ```typescript
	 * await userDao.delete('user123');
	 * console.log('User deleted');
	 * ```
	 */
	async delete(id: any) {
		await db.collection(this.table).doc(String(id)).delete();
		return { id };
	}

	/**
	 * Finds all documents matching the specified criteria.
	 * Performs equality comparison on all provided fields.
	 * 
	 * @async
	 * @param {Record<string, any>} criteria - Field-value pairs to match
	 * @returns {Promise<any[]>} An array of matching documents
	 * 
	 * @example
	 * ```typescript
	 * const activeUsers = await userDao.findBy({ isActive: true, age: 25 });
	 * console.log(activeUsers.length);
	 * ```
	 */
	async findBy(criteria: Record<string, any>) {
		let q: FirebaseFirestore.Query = db.collection(this.table);
		for (const [k, v] of Object.entries(criteria)) {
			q = q.where(k, '==', v as any);
		}
		const snap = await q.get();
		return snap.docs.map((d) => this.normalizeDoc(d));
	}

	/**
	 * Finds the first document matching the specified criteria.
	 * Useful when you expect only one result or just need the first match.
	 * 
	 * @async
	 * @param {Record<string, any>} criteria - Field-value pairs to match
	 * @returns {Promise<any | null>} The first matching document or null if not found
	 * 
	 * @example
	 * ```typescript
	 * const user = await userDao.findOneBy({ email: 'john@example.com' });
	 * if (user) {
	 *   console.log('User found:', user.name);
	 * }
	 * ```
	 */
	async findOneBy(criteria: Record<string, any>) {
		let q: FirebaseFirestore.Query = db.collection(this.table);
		for (const [k, v] of Object.entries(criteria)) {
			q = q.where(k, '==', v as any);
		}
		q = q.limit(1);
		const snap = await q.get();
		if (snap.empty) return null;
		return this.normalizeDoc(snap.docs[0]);
	}
}

export default GlobalDAO;
