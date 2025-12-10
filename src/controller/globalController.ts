import { Request, Response } from 'express';

/**
 * Generic controller class providing CRUD operations for any entity.
 * 
 * @class GlobalController
 * @description This controller implements a reusable pattern for handling HTTP requests
 * and delegating data operations to a Data Access Object (DAO). It provides standard
 * REST API endpoints with consistent response formatting and error handling.
 * 
 * @example
 * ```typescript
 * import GlobalController from './controller/globalController';
 * import GlobalDAO from './dao/globalDAO';
 * 
 * const userDao = new GlobalDAO('users', 'id');
 * const userController = new GlobalController(userDao);
 * 
 * router.get('/users', userController.getAll);
 * router.get('/users/:id', userController.read);
 * router.post('/users', userController.create);
 * ```
 */
class GlobalController {
	/**
	 * The Data Access Object used to perform database operations.
	 * @type {any}
	 */
	dao: any;

	/**
	 * Creates an instance of GlobalController.
	 * 
	 * @constructor
	 * @param {any} dao - The DAO instance for data operations
	 * 
	 * @example
	 * ```typescript
	 * const meetingsDao = new GlobalDAO('meetings', 'id');
	 * const meetingsController = new GlobalController(meetingsDao);
	 * ```
	 */
	constructor(dao: any) {
		this.dao = dao;
	}

	/**
	 * Retrieves all records from the collection.
	 * 
	 * @async
	 * @method getAll
	 * @param {Request} req - Express request object
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * **HTTP Method:** GET
	 * **Success Response:** 200 OK with array of records
	 * **Error Response:** 500 Internal Server Error
	 * 
	 * @example
	 * **Request:**
	 * ```
	 * GET /api/users
	 * ```
	 * 
	 * **Response:**
	 * ```json
	 * {
	 *   "success": true,
	 *   "data": [
	 *     { "id": "1", "name": "John" },
	 *     { "id": "2", "name": "Jane" }
	 *   ]
	 * }
	 * ```
	 */
	getAll = async (req: Request, res: Response) => {
		try {
			const items = await this.dao.getAll();
			res.status(200).json({
				success: true,
				data: items,
			});
		} catch (error: any) {
			res.status(500).json({
				success: false,
				message: 'Error retrieving records',
				error: error.message,
			});
		}
	};

	/**
	 * Retrieves a single record by its ID.
	 * 
	 * @async
	 * @method read
	 * @param {Request} req - Express request object (expects `id` in params)
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * **HTTP Method:** GET
	 * **URL Parameter:** `id` - The record ID to retrieve
	 * **Success Response:** 200 OK with the record data
	 * **Error Responses:**
	 * - 404 Not Found if record doesn't exist
	 * - 500 Internal Server Error
	 * 
	 * @example
	 * **Request:**
	 * ```
	 * GET /api/users/user123
	 * ```
	 * 
	 * **Response:**
	 * ```json
	 * {
	 *   "success": true,
	 *   "data": {
	 *     "id": "user123",
	 *     "name": "John Doe",
	 *     "email": "john@example.com"
	 *   }
	 * }
	 * ```
	 */
	read = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const item = await this.dao.getById(id);

			if (!item) {
				return res.status(404).json({
					success: false,
					message: 'Record not found',
				});
			}

			res.status(200).json({
				success: true,
				data: item,
			});
		} catch (error: any) {
			res.status(500).json({
				success: false,
				message: 'Error retrieving record',
				error: error.message,
			});
		}
	};

	/**
	 * Creates a new record in the collection.
	 * 
	 * @async
	 * @method create
	 * @param {Request} req - Express request object (expects data in body)
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * **HTTP Method:** POST
	 * **Request Body:** Object containing the new record's data
	 * **Success Response:** 201 Created with the new record
	 * **Error Response:** 400 Bad Request if validation fails
	 * 
	 * @example
	 * **Request:**
	 * ```
	 * POST /api/users
	 * Content-Type: application/json
	 * 
	 * {
	 *   "name": "Alice",
	 *   "email": "alice@example.com",
	 *   "age": 28
	 * }
	 * ```
	 * 
	 * **Response:**
	 * ```json
	 * {
	 *   "success": true,
	 *   "message": "Record created successfully",
	 *   "data": {
	 *     "id": "newUser123",
	 *     "name": "Alice",
	 *     "email": "alice@example.com",
	 *     "age": 28
	 *   }
	 * }
	 * ```
	 */
	create = async (req: Request, res: Response) => {
		try {
			const newItem = await this.dao.create(req.body);
			res.status(201).json({
				success: true,
				message: 'Record created successfully',
				data: newItem,
			});
		} catch (error: any) {
			res.status(400).json({
				success: false,
				message: 'Error creating record',
				error: error.message,
			});
		}
	};

	/**
	 * Updates an existing record by its ID.
	 * 
	 * @async
	 * @method update
	 * @param {Request} req - Express request object (expects `id` in params and update data in body)
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * **HTTP Method:** PUT or PATCH
	 * **URL Parameter:** `id` - The record ID to update
	 * **Request Body:** Object containing fields to update
	 * **Success Response:** 200 OK with updated record
	 * **Error Responses:**
	 * - 404 Not Found if record doesn't exist
	 * - 400 Bad Request if validation fails
	 * 
	 * @example
	 * **Request:**
	 * ```
	 * PUT /api/users/user123
	 * Content-Type: application/json
	 * 
	 * {
	 *   "age": 29,
	 *   "name": "John Updated"
	 * }
	 * ```
	 * 
	 * **Response:**
	 * ```json
	 * {
	 *   "success": true,
	 *   "message": "Record updated successfully",
	 *   "data": {
	 *     "id": "user123",
	 *     "name": "John Updated",
	 *     "age": 29,
	 *     "email": "john@example.com"
	 *   }
	 * }
	 * ```
	 */
	update = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const updatedItem = await this.dao.update(id, req.body);

			if (!updatedItem) {
				return res.status(404).json({
					success: false,
					message: 'Record not found',
				});
			}

			res.status(200).json({
				success: true,
				message: 'Record updated successfully',
				data: updatedItem,
			});
		} catch (error: any) {
			res.status(400).json({
				success: false,
				message: 'Error updating record',
				error: error.message,
			});
		}
	};

	/**
	 * Deletes a record by its ID.
	 * 
	 * @async
	 * @method delete
	 * @param {Request} req - Express request object (expects `id` in params)
	 * @param {Response} res - Express response object
	 * @returns {Promise<void>}
	 * 
	 * @description
	 * **HTTP Method:** DELETE
	 * **URL Parameter:** `id` - The record ID to delete
	 * **Success Response:** 200 OK with success message
	 * **Error Responses:**
	 * - 404 Not Found if record doesn't exist
	 * - 500 Internal Server Error
	 * 
	 * @example
	 * **Request:**
	 * ```
	 * DELETE /api/users/user123
	 * ```
	 * 
	 * **Response:**
	 * ```json
	 * {
	 *   "success": true,
	 *   "message": "Record deleted successfully"
	 * }
	 * ```
	 */
	delete = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const deletedItem = await this.dao.delete(id);

			if (!deletedItem) {
				return res.status(404).json({
					success: false,
					message: 'Registro no encontrado',
				});
			}

			res.status(200).json({
				success: true,
				message: 'Registro eliminado exitosamente',
			});
		} catch (error: any) {
			res.status(500).json({
				success: false,
				message: 'Error al eliminar registro',
				error: error.message,
			});
		}
	};
}

export default GlobalController;
