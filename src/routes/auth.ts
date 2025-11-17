import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser } from '../dao/userDAO';
import { UserModel } from '../models/users';
import GlobalDAO from '../dao/globalDAO';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../utils/mailer';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';


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

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email y password son requeridos"
      });
    }

    const user: any = await userDao.findOneBy({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas"
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas"
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES || "1h"
      } as any
    );

    delete user.password;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      token,
      user
    });

  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error interno"
    });
  }
});

//POST /firebase-login
// POST /auth/firebase-login
router.post("/firebase-login", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken es requerido",
      });
    }

    // 1️⃣ Verificar token con Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);

    const {
      uid,
      email,
      name,
      picture,
    } = decoded;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Firebase no devolvió un email válido",
      });
    }

    // 2️⃣ Buscar o crear usuario en tu base
    let user: any = await userDao.findOneBy({ email });

    if (!user) {
      user = await userDao.create({
        firebaseUid: uid,
        name: name || "Usuario",
        email,
        photoURL: picture || null,
        password: null, // usuario de Google no usa password
      });
    }

    // 3️⃣ Generar JWT propio del backend
    const payload = {
      id: user.id,
      email: user.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES || "7d",
      } as any
    );

    // 4️⃣ Respuesta al frontend
    return res.status(200).json({
      success: true,
      user: {
        uid,
        displayName: user.name,
        email: user.email,
        photoURL: user.photoURL,
        token,
      },
      token,
    });

  } catch (err: any) {
    console.error("Firebase Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Error en Firebase Login",
      error: err.message,
    });
  }
});

// POST /auth/me 
router.post('/me', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token es requerido',
      });
    }

    // Verificar token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
      });
    }

    // Buscar usuario en Supabase
    const user = await userDao.getById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });

  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error interno',
    });
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
