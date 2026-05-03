const nodemailer = require('nodemailer');

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

function isSmtpConfigured() {
  return !!createTransport();
}

/**
 * Sends password reset link. Requires SMTP_* env (Gmail: use an App Password, not your normal password).
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transport = createTransport();
  if (!transport) {
    const err = new Error('SMTP is not configured (set SMTP_USER and SMTP_PASS)');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const from = process.env.MAIL_FROM || `"PrepView" <${process.env.SMTP_USER}>`;
  const subject = 'Reset your PrepView password';

  await transport.sendMail({
    from,
    to: toEmail,
    subject,
    text: `Reset your password by opening this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Reset your PrepView password using the link below (valid for <strong>1 hour</strong>).</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendPasswordResetEmail, isSmtpConfigured };
