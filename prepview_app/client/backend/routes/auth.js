const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { sendPasswordResetEmail } = require('../utils/mail');

const prisma = new PrismaClient();

function appPublicBaseUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

// Validation schemas
const signupSchema = z.object({
  // UPDATE 1: 'name' ki jagah 'username'
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().min(10, 'Invalid reset link'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    // UPDATE 2: Destructuring 'username'
    const { username, email, password } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username, // Database field: username
        email,
        password_hash: hashedPassword, // UPDATE 3: Database field is 'password_hash'
      },
      select: {
        id: true,
        username: true,
        email: true,
        created_at: true, // UPDATE 4: Database field is 'created_at'
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    // UPDATE 5: Compare against 'user.password_hash'
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username, // Return username
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot password — email contains link to /reset-password?token=...&email=...
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    const genericMessage = {
      message: 'If an account exists for that email, we sent password reset instructions.',
    };

    if (!user) {
      return res.json(genericMessage);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: token,
        password_reset_expires: expires,
      },
    });

    const resetUrl = `${appPublicBaseUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (mailErr) {
      console.error('Forgot-password mail error:', mailErr.message);
      await prisma.user.update({
        where: { id: user.id },
        data: { password_reset_token: null, password_reset_expires: null },
      });
      if (mailErr.code === 'SMTP_NOT_CONFIGURED') {
        return res.status(503).json({
          message:
            'Email is not configured on the server. Set SMTP_USER, SMTP_PASS, and optionally SMTP_HOST (e.g. Gmail with an App Password).',
        });
      }
      return res.status(500).json({
        message: 'Could not send reset email. Check server email settings or try again later.',
      });
    }

    return res.json(genericMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Forgot-password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password using token from email
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      !user.password_reset_token ||
      !user.password_reset_expires ||
      user.password_reset_token !== token ||
      user.password_reset_expires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: 'Invalid or expired reset link. Please request a new password reset.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    res.json({ message: 'Password updated successfully. You can sign in with your new password.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Reset-password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;