/**
 * Authentication routes module for AgoraX.
 * 
 * @module routes/auth
 * @description Provides authentication endpoints including user registration, login (both local and Firebase),
 * password reset functionality with email notifications. Supports dual authentication methods:
 * 1. Local email/password authentication with bcrypt
 * 2. Firebase Authentication with idToken verification
 */

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { admin } from '../config/database';
import { createUser } from '../dao/userDAO';
import { UserModel } from '../models/users';
import GlobalDAO from '../dao/globalDAO';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../utils/mailer';
 
const router = express.Router();

const userDao = new GlobalDAO('users', 'id');

/**
 * Register a new user account.
 * 
 * @route POST /auth/register
 * @group Authentication - User authentication operations
 * @param {string} name.body.required - User's full name
 * @param {string} email.body.required - User's email address (must be unique)
 * @param {number} age.body.required - User's age
 * @param {string} password.body - Password for local authentication (required if firebaseUid not provided)
 * @param {string} firebaseUid.body - Firebase UID for Firebase authentication (required if password not provided)
 * @param {string} photoURL.body - URL to user's profile photo
 * @returns {object} 201 - User created successfully
 * @returns {object} 400 - Invalid input data
 * @returns {object} 409 - Email already registered
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request Body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "age": 25,
 *   "password": "securePassword123",
 *   "photoURL": "https://example.com/photo.jpg"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "id": "user123",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "age": 25
 *   }
 * }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, age, password, firebaseUid, photoURL } = req.body;

    // Require name, email, age and at least one of password or firebaseUid
    if (!name || !email || !age || (!password && !firebaseUid)) {
      return res.status(400).json({ error: 'name, email, age and password or firebaseUid are required' });
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

    // Hash password if provided
    const hashed = password ? await bcrypt.hash(password, 10) : undefined;

    const user: UserModel = {
      name,
      email,
      age,
      password: hashed ?? null,
      firebaseUid: firebaseUid || undefined,
      photoURL: photoURL || undefined,
    };

    const created = await createUser(user);

    return res.status(201).json({ success: true, user: created });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
});

/**
 * Authenticate a user and generate a JWT token.
 * 
 * @route POST /auth/login
 * @group Authentication - User authentication operations
 * @description Supports two authentication methods:
 * 1. Firebase idToken verification for Firebase-authenticated users
 * 2. Email/password authentication for local users with bcrypt
 * 
 * @param {string} idToken.body - Firebase ID token (for Firebase auth flow)
 * @param {string} email.body - User's email address (for local auth flow)
 * @param {string} password.body - User's password (for local auth flow)
 * @returns {object} 200 - Login successful with JWT token
 * @returns {object} 400 - Invalid input or authentication method mismatch
 * @returns {object} 401 - Invalid credentials
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Firebase Auth Request:
 * {
 *   "idToken": "firebase-id-token-here"
 * }
 * 
 * Local Auth Request:
 * {
 *   "email": "john@example.com",
 *   "password": "securePassword123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "token": "jwt-token-here",
 *   "user": {
 *     "id": "user123",
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, idToken } = req.body;

    // Support two login flows:
    // 1) email + password (local password stored in Firestore)
    // 2) idToken (Firebase client idToken): verify token and trust Firebase auth

    if (idToken) {
      // Verify Firebase idToken
      let decoded: any;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch (e: any) {
        console.error('verifyIdToken error:', e && e.message ? e.message : e);
        return res.status(401).json({ success: false, message: 'Invalid Firebase idToken', detail: e?.message });
      }

      const uid = decoded.uid;
      const userByUid: any = await userDao.findOneBy({ firebaseUid: uid });
      if (!userByUid) {
        // Optionally create a user record if not found
        const emailFromToken = decoded.email;
        const nameFromToken = decoded.name || '';
        const photoFromToken = decoded.picture || undefined;
        const created = await createUser({
          name: nameFromToken || emailFromToken || 'Firebase User',
          email: emailFromToken,
          age: 0,
          password: null,
          firebaseUid: uid,
          photoURL: photoFromToken,
        } as any);
        const payload = { id: created.id, email: created.email };
        const token = (jwt as any).sign(payload, process.env.JWT_SECRET as any || 'change_this_secret', { expiresIn: process.env.JWT_EXPIRES || '1h' });
        const safeUser = { ...created } as any;
        delete safeUser.password;
        delete safeUser.resetPasswordToken;
        delete safeUser.resetPasswordExpires;
        return res.status(200).json({ success: true, token, user: safeUser });
      }

      const payload = { id: userByUid.id, email: userByUid.email };
      const token = (jwt as any).sign(payload, process.env.JWT_SECRET as any || 'change_this_secret', { expiresIn: process.env.JWT_EXPIRES || '1h' });
      const safeUser = { ...userByUid } as any;
      delete safeUser.password;
      delete safeUser.resetPasswordToken;
      delete safeUser.resetPasswordExpires;
      return res.status(200).json({ success: true, token, user: safeUser });
    }

    // Fallback: email + password
    if (!email || !password) return res.status(400).json({ success: false, message: 'email and password are required' });

    const user: any = await userDao.findOneBy({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // If user has no local password (managed by Firebase), reject and instruct client to use idToken flow
    if (!user.password && user.firebaseUid) {
      return res.status(400).json({ success: false, message: 'Use Firebase sign-in (send idToken) for this account' });
    }

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { id: user.id, email: user.email };
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = (jwt as any).sign(payload, secret as any, { expiresIn: process.env.JWT_EXPIRES || '1h' });

    // remove sensitive fields
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;

    return res.status(200).json({ success: true, token, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'internal error' });
  }
});

/**
 * Request a password reset email.
 * 
 * @route POST /auth/forgot-password
 * @group Authentication - User authentication operations
 * @description Generates a secure reset token, stores it with an expiration time,
 * and sends a password reset email to the user using the Resend API.
 * The token expires after 15 minutes for security.
 * 
 * @param {string} email.body.required - Email address of the account to reset
 * @returns {object} 200 - Reset email sent successfully
 * @returns {object} 400 - Email is required
 * @returns {object} 404 - No account found with that email
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request:
 * {
 *   "email": "john@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password reset email sent"
 * }
 */
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

/**
 * Reset user password using a valid reset token.
 * 
 * @route POST /auth/reset-password
 * @group Authentication - User authentication operations
 * @description Validates the reset token and expiration, then updates the user's password.
 * Handles both Firebase-managed users (updates Firebase Auth password) and local users
 * (updates hashed password in Firestore). Clears reset token after successful reset.
 * 
 * @param {string} token.body.required - Password reset token received via email
 * @param {string} newPassword.body.required - New password to set
 * @returns {object} 200 - Password updated successfully
 * @returns {object} 400 - Invalid or expired token, or missing parameters
 * @returns {object} 500 - Internal server error
 * 
 * @example
 * Request:
 * {
 *   "token": "reset-token-from-email",
 *   "newPassword": "newSecurePassword456"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password updated successfully",
 *   "user": {
 *     "id": "user123",
 *     "email": "john@example.com"
 *   }
 * }
 */
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

    // Hash nueva contraseña or update in Firebase if user is managed there
    const hashed = await bcrypt.hash(newPassword, 10);

    let updated: any = null;
    if (user.firebaseUid) {
      // Update password in Firebase Auth
      try {
        await admin.auth().updateUser(user.firebaseUid, { password: newPassword });
      } catch (e) {
        console.error('Error updating Firebase user password:', e);
        return res.status(500).json({ success: false, message: 'Error updating Firebase password' });
      }
      // Clear reset fields in Firestore user document
      updated = await userDao.update(user.id, {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });
    } else {
      // Local password: update in Firestore document
      updated = await userDao.update(user.id, {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });
    }

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente', user: updated });
  } catch (err: any) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'error interno' });
  }
});

export default router;
