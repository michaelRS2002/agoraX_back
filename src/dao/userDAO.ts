import { supabase } from '../config/database';
import { UserModel } from '../models/users';

/**
 * Insert a user into the 'users' table in Supabase.
 * Returns the inserted row(s) on success or throws an error.
 */
export async function createUser(user: UserModel) {
  const payload: any = { ...user };
  if (payload.resetPasswordExpires instanceof Date) {
    payload.resetPasswordExpires = payload.resetPasswordExpires.toISOString();
  }

  const { data, error } = await supabase.from('users').insert([payload]).select();

  if (error) {
    throw error;
  }

  return data;
}
