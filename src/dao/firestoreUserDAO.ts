import { db } from '../config/firebase';
import { UserModel } from '../models/users';
import { Timestamp } from 'firebase-admin/firestore';

const collection = () => db.collection('users');

export async function createUserFirestore(user: UserModel) {
  const ref = collection().doc();
  const data: any = { ...user };

  if (data.resetPasswordExpires instanceof Date) {
    data.resetPasswordExpires = Timestamp.fromDate(data.resetPasswordExpires);
  }

  await ref.set(data);
  const snap = await ref.get();
  return { id: ref.id, ...(snap.data() || {}) };
}

export async function getUserByEmailFirestore(email: string) {
  const q = await collection().where('email', '==', email).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, ...(doc.data() as any) };
}

export async function setResetTokenFirestoreByEmail(email: string, token: string, expires: Date) {
  const q = await collection().where('email', '==', email).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0];
  await doc.ref.update({
    resetPasswordToken: token,
    resetPasswordExpires: Timestamp.fromDate(expires),
  });
  const updated = await doc.ref.get();
  return { id: updated.id, ...(updated.data() as any) };
}

export async function findUserByResetTokenFirestore(token: string) {
  const q = await collection().where('resetPasswordToken', '==', token).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, ...(doc.data() as any) };
}

export async function updatePasswordFirestore(userId: string, newPasswordHash: string) {
  const ref = collection().doc(userId);
  await ref.update({ password: newPasswordHash, resetPasswordToken: null, resetPasswordExpires: null });
  const snap = await ref.get();
  return { id: snap.id, ...(snap.data() as any) };
}
