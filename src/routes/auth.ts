import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser } from '../dao/userDAO';
import { UserModel } from '../models/users';
import GlobalDAO from '../dao/globalDAO';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../utils/mailer';

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

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email es requerido' });

    // Buscar usuario
    const user: any = await userDao.findOneBy({ email });
    if (!user) {
      // Informar al cliente que el correo no está registrado (según petición del usuario)
      return res.status(404).json({ success: false, message: 'No existe una cuenta con ese correo' });
    }

    // Generar token y expiración
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar token en la tabla users (campo resetPasswordToken, resetPasswordExpires)
    const updated = await userDao.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires.toISOString(),
    });

    // Enviar correo
    await sendResetPasswordEmail(email, token);

    return res.status(200).json({ success: true, message: 'Correo de restablecimiento enviado' , updated});
  } catch (err: any) {
    console.error('Forgot-password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'error interno' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'token y newPassword son requeridos' });

    // Buscar usuario por token
    const user: any = await userDao.findOneBy({ resetPasswordToken: token });
    if (!user) return res.status(400).json({ success: false, message: 'Token inválido o expirado' });

    // Comprobar expiración
    const expires = user.resetPasswordExpires ? new Date(user.resetPasswordExpires) : null;
    if (!expires || expires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }

    // Hash nueva contraseña
    const hashed = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar token
    const updated = await userDao.update(user.id, {
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente', user: updated });
  } catch (err: any) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'error interno' });
  }
});

export default router;
