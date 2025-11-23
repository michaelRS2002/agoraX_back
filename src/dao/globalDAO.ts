import { db } from '../config/firebase';

/**
 * Generic DAO backed by Firestore.
 * Usage: const dao = new GlobalDAO('users', 'id')
 */
class GlobalDAO {
	table: string;
	pk: string;

	constructor(table: string, primaryKey = 'id') {
		this.table = table;
		this.pk = primaryKey;
	}

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

	// Obtener todos los registros
	async getAll() {
		const snap = await db.collection(this.table).get();
		return snap.docs.map((d) => this.normalizeDoc(d));
	}

	// Obtener un registro por ID
	async getById(id: any) {
		const doc = await db.collection(this.table).doc(String(id)).get();
		if (!doc.exists) return null;
		return this.normalizeDoc(doc);
	}

	// Crear un nuevo registro
	async create(payload: any) {
		const ref = await db.collection(this.table).add(payload);
		const doc = await ref.get();
		return this.normalizeDoc(doc);
	}

	// Actualizar un registro por PK
	async update(id: any, payload: any) {
		const docRef = db.collection(this.table).doc(String(id));
		await docRef.update(payload);
		const doc = await docRef.get();
		return this.normalizeDoc(doc);
	}

	// Eliminar un registro por PK
	async delete(id: any) {
		await db.collection(this.table).doc(String(id)).delete();
		return { id };
	}

	// Buscar por criterios específicos (match)
	async findBy(criteria: Record<string, any>) {
		let q: FirebaseFirestore.Query = db.collection(this.table);
		for (const [k, v] of Object.entries(criteria)) {
			q = q.where(k, '==', v as any);
		}
		const snap = await q.get();
		return snap.docs.map((d) => this.normalizeDoc(d));
	}

	// Buscar un registro por criterios específicos (uno)
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
