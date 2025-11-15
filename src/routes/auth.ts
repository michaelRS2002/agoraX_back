import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser } from '../dao/userDAO';
import { UserModel } from '../models/users';
import GlobalDAO from '../dao/globalDAO';

const router = express.Router();

const userDao = new GlobalDAO('users', 'id');

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, age, password } = req.body;

    if (!name || !email || !age || !password) {
      return res.status(400).json({ error: 'name, email, age and password are required' });
    }

    // Basic validation
    if (typeof age !== 'number') {
      return res.status(400).json({ error: 'age must be a number' });
    }

    // Check if email already exists
    const existing = await userDao.findOneBy({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const user: UserModel = {
      name,
      email,
      age,
      password: hashed,
    };

    const created = await createUser(user);

    return res.status(201).json({ success: true, user: created });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
});

export default router;
