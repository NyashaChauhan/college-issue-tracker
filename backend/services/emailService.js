// backend/services/emailService.js
// Nodemailer wrapper using Gmail SMTP

'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT, 10),
      secure: parseInt(process.env.EMAIL_PORT, 10) === 465, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send a password-reset email.
 * @param {string} toEmail  Recipient email address
 * @param {string} name     Recipient display name
 * @param {string} token    Raw reset token (hex string)
 */
async function sendPasswordResetEmail(toEmail, name, token) {
  const resetUrl = `${process.env.COLLEGE_DOMAIN}/reset-password?token=${token}`;

  const mailOptions = {
    from:    `"College Issue Tracker" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset the password for your College Issue Tracker account.</p>
        <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <hr/>
        <p style="font-size:12px;color:#6b7280;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };
