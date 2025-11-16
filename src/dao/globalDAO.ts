import { supabase } from '../config/database';

/**
 * Generic DAO for Supabase tables.
 * Usage: const dao = new GlobalDAO('users', 'id')
 */
class GlobalDAO {
	table: string;
	pk: string;

	constructor(table: string, primaryKey = 'id') {
		this.table = table;
		this.pk = primaryKey;
	}

	// Obtener todos los registros
	async getAll() {
		const { data, error } = await supabase.from(this.table).select('*');
		if (error) throw error;
		return data || [];
	}

	// Obtener un registro por ID
	async getById(id: any) {
		const { data, error } = await supabase
			.from(this.table)
			.select('*')
			.eq(this.pk, id)
			.maybeSingle();
		if (error) throw error;
		return data ?? null;
	}

	// Crear un nuevo registro
	async create(payload: any) {
		const { data, error } = await supabase.from(this.table).insert([payload]).select();
		if (error) throw error;
		// return single row if available
		return Array.isArray(data) ? data[0] ?? null : data;
	}

	// Actualizar un registro por PK
	async update(id: any, payload: any) {
		const { data, error } = await supabase
			.from(this.table)
			.update(payload)
			.eq(this.pk, id)
			.select();
		if (error) throw error;
		return Array.isArray(data) ? data[0] ?? null : data;
	}

	// Eliminar un registro por PK
	async delete(id: any) {
		const { data, error } = await supabase.from(this.table).delete().eq(this.pk, id).select();
		if (error) throw error;
		return Array.isArray(data) ? data[0] ?? null : data;
	}

	// Buscar por criterios específicos (match)
	async findBy(criteria: Record<string, any>) {
		const { data, error } = await supabase.from(this.table).select('*').match(criteria);
		if (error) throw error;
		return data || [];
	}

	// Buscar un registro por criterios específicos (uno)
	async findOneBy(criteria: Record<string, any>) {
		const { data, error } = await supabase.from(this.table).select('*').match(criteria).maybeSingle();
		if (error) throw error;
		return data ?? null;
	}
}

export default GlobalDAO;
