/**
 * Email utility module for sending transactional emails.
 * 
 * @module utils/mailer
 * @description Provides email functionality using the Resend API for sending
 * password reset emails and other transactional notifications.
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Resend API client instance.
 * @type {Resend}
 */
const resend = new Resend(process.env.RESEND_API_KEY || '');

/**
 * Sends a password reset email to a user with a secure reset link.
 * 
 * @async
 * @function sendResetPasswordEmail
 * @param {string} to - The recipient's email address
 * @param {string} token - The unique password reset token
 * @returns {Promise<void>}
 * @throws {Error} If the email fails to send via Resend API
 * 
 * @description
 * Generates a styled HTML email containing a password reset link with the provided token.
 * The email includes:
 * - A prominent call-to-action button
 * - Security warnings and expiration notice (15 minutes)
 * - Fallback plain text URL for email clients that don't render HTML
 * 
 * The reset link points to the frontend URL specified in FRONTEND_URL environment variable.
 * 
 * @example
 * ```typescript
 * const resetToken = crypto.randomBytes(32).toString('hex');
 * await sendResetPasswordEmail('user@example.com', resetToken);
 * console.log('Password reset email sent successfully');
 * ```
 * 
 * @security
 * - Tokens should expire after 15 minutes
 * - Tokens should be single-use only
 * - Uses HTTPS for reset links in production
 */
export async function sendResetPasswordEmail(to: string, token: string) {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0;">AgoraX</h1>
      </div>
      
      <div style="background-color: #e7e7e7; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333; margin-top: 0;">Restablecer Contraseña</h2>
        
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en AgoraX.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #000000; 
                    color: #ffffff; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;
                    font-weight: bold;">
            Restablecer Contraseña
          </a>
        </div>

        <div style="background-color: #d9d9d9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #333;"><strong>⚠️ Importante:</strong></p>
          <ul style="color: #333; margin: 10px 0;">
            <li>Este enlace expirará en <strong>15 minutos</strong> por seguridad</li>
            <li>Solo puedes usar este enlace una vez</li>
            <li>Si no solicitaste este cambio, ignora este email</li>
          </ul>
        </div>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e7e7e7; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Este es un mensaje automático de AgoraX. Por favor, no respondas a este email.
      </p>
      <p style="color: #999; font-size: 12px;">
        Si tienes problemas con el enlace, copia y pega esta URL en tu navegador:<br>
        <span style="word-break: break-all;">${resetLink}</span>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: 'AgoraX <noreply@messagesmail.store>',
    to,
    subject: 'Restablecer Contraseña - AgoraX',
    html: htmlContent,
  });

  console.log('✅ Correo de restablecimiento enviado a', to);
}