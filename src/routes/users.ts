import express, { Request, Response } from 'express';
import GlobalDAO from '../dao/globalDAO';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { admin } from '../config/database';

const router = express.Router();
const userDao = new GlobalDAO('users', 'id');

// GET /users/:id - return user (safe)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user: any = await userDao.getById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const safe = { ...user } as any;
    delete safe.password;
    delete safe.resetPasswordToken;
    delete safe.resetPasswordExpires;
    return res.status(200).json({ success: true, user: safe });
  } catch (err: any) {
    console.error('Get user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

// PUT /users/:id - update a user (requires auth token of same user)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Missing token' });
    const token = auth.slice(7);
    let decoded: any;
    try {
      decoded = (jwt as any).verify(token, process.env.JWT_SECRET || 'change_this_secret');
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { id } = req.params;
    if (!decoded || decoded.id !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }

    // Prevent updates to sensitive fields
    const forbidden = ['password', 'firebaseUid', 'resetPasswordToken', 'resetPasswordExpires'];
    const updates: any = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (forbidden.includes(k)) continue;
      updates[k] = v;
    }

    // Cast numeric fields if needed
    if (typeof updates.age !== 'undefined') {
      const num = Number(updates.age);
      if (!Number.isFinite(num)) delete updates.age;
      else updates.age = num;
    }

    const existing: any = await userDao.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    // If the account is managed by Firebase, disallow profile edits via this route
    if (existing.firebaseUid) {
      return res.status(403).json({ success: false, message: 'Cannot edit social-authenticated user via this endpoint' });
    }

    const updated = await userDao.update(id, updates);
    const safe = { ...updated } as any;
    delete safe.password;
    delete safe.resetPasswordToken;
    delete safe.resetPasswordExpires;

    return res.status(200).json({ success: true, user: safe });
  } catch (err: any) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

// DELETE /users/:id - delete a user (requires auth token of same user)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Missing token' });
    const token = auth.slice(7);
    let decoded: any;
    try {
      decoded = (jwt as any).verify(token, process.env.JWT_SECRET || 'change_this_secret');
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { id } = req.params;
    if (!decoded || decoded.id !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
    }

    // find user
    const user: any = await userDao.getById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If user has a local password, require correct password in body
    const { password } = req.body || {};
    if (!user.firebaseUid) {
      // local account: ensure password provided and matches
      if (!password) return res.status(400).json({ success: false, message: 'Password required to delete local account' });
      const match = await bcrypt.compare(password, user.password || '');
      if (!match) return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // If managed by Firebase (social login), delete from Firebase Auth first
    if (user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (e) {
        // Log and continue — we still remove Firestore record
        console.error('Error deleting Firebase Auth user:', e);
      }
    }

    // Delete Firestore document
    await userDao.delete(id);

    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

export default router;
