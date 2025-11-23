import GlobalDAO from './globalDAO';
import { UserModel } from '../models/users';

const dao = new GlobalDAO('users', 'id');

/**
 * Create a user in Firestore-backed `users` collection.
 */
export async function createUser(user: UserModel) {
  const payload: any = { ...user };
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
