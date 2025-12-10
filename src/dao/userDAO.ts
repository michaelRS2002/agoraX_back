import GlobalDAO from './globalDAO';
import { UserModel } from '../models/users';

/**
 * Data Access Object instance for user operations.
 * Uses the 'users' Firestore collection with 'id' as the primary key.
 * @type {GlobalDAO}
 */
const dao = new GlobalDAO('users', 'id');

/**
 * Creates a new user in the Firestore 'users' collection.
 * 
 * @async
 * @function createUser
 * @param {UserModel} user - The user data to create
 * @returns {Promise<any>} The created user document with auto-generated ID
 * @throws {Error} If Firestore rejects the document (e.g., validation errors)
 * 
 * @description
 * This function prepares user data for Firestore storage by:
 * - Converting Date objects to ISO strings for Firestore compatibility
 * - Removing undefined values to prevent Firestore errors
 * - Delegating to the GlobalDAO for actual creation
 * 
 * @example
 * ```typescript
 * const newUser = await createUser({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 25,
 *   password: 'hashedPassword',
 *   firebaseUid: 'firebase-uid-123'
 * });
 * console.log('Created user with ID:', newUser.id);
 * ```
 */
export async function createUser(user: UserModel) {
  const payload: any = { ...user };
  
  // Convert Date objects to ISO strings for Firestore compatibility
  if (payload.resetPasswordExpires instanceof Date) {
    payload.resetPasswordExpires = payload.resetPasswordExpires.toISOString();
  }
  
  // Remove keys with undefined values so Firestore doesn't reject the document
  for (const k of Object.keys(payload)) {
    if (typeof payload[k] === 'undefined') delete payload[k];
  }
  
  const created = await dao.create(payload);
  return created;
}
