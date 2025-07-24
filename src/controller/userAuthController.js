import bcrypt from 'bcrypt';
import { client } from '../config/connection.js';
import  generateTokenSetCookie  from '../utils/generate.js'; 
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const saltRounds = 10;

// ======================
// Register User 
// ======================
export const registerUser = async (req, res) => {
  const {
    role,
    username,
    phone_number,
    email,
    password,
    department,
    year,
    section,
    roll_number,
  } = req.body;

  // Basic validations
  if (!role || !username || !phone_number || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Student-specific validations
  if (role === 'student') {
    if (!department || !year || !section || !roll_number) {
      return res.status(400).json({
        message: 'Department, Year, Section, and Roll Number are required for students',
      });
    }
  }

  try {
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2 OR phone_number = $3',
      [email, username, phone_number]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (existing.email === email) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      if (existing.username === username) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      if (existing.phone_number === phone_number) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }

      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      `INSERT INTO users 
        (role, username, phone_number, email, password, department, year, section, roll_number)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, role, username, email, department, year, section, roll_number`,
      [
        role,
        username,
        phone_number,
        email,
        hashedPassword,
        role === 'student' ? department : null,
        role === 'student' ? year : null,
        role === 'student' ? section : null,
        role === 'student' ? roll_number : null,
      ]
    );

    res.status(201).json({
      message: 'User registered successfully. Please login.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ======================
// Login User (Generate token here)
// ======================
export const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const user = result.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: 'Role mismatch. Access denied.' });
    }

    const token = generateTokenSetCookie(user.id, user.role, res);

    delete user.password;

    return res.status(200).json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

//update user details
export const editUser = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId; // string UUID
    const loggedInUserRole = req.user.role;
    const targetUserId = req.params.id; // keep as string for UUID

    // Check UUID validity optionally (simple regex or library)
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (loggedInUserId !== targetUserId && loggedInUserRole !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. You can only edit your own profile or must be an admin.',
      });
    }

    const { username, email, phone_number, role } = req.body;

    // Build conflict checks dynamically
    const conflictQueryParts = [];
    const conflictValues = [];
    let idx = 1;

    if (username) {
      conflictQueryParts.push(`username = $${idx++}`);
      conflictValues.push(username);
    }
    if (email) {
      conflictQueryParts.push(`email = $${idx++}`);
      conflictValues.push(email);
    }
    if (phone_number) {
      conflictQueryParts.push(`phone_number = $${idx++}`);
      conflictValues.push(phone_number);
    }

    if (conflictQueryParts.length > 0) {
      // Add targetUserId as last param
      conflictValues.push(targetUserId);
      const conflictCheckQuery = `
        SELECT id FROM users
        WHERE (${conflictQueryParts.join(' OR ')}) AND id != $${idx}
      `;

      const conflictResult = await client.query(conflictCheckQuery, conflictValues);
      if (conflictResult.rows.length > 0) {
        return res
          .status(409)
          .json({ message: 'Username, email, or phone number already in use by another user' });
      }
    }

    const updatedRole = loggedInUserRole === 'admin' ? role : undefined;

    // Prepare update query params
    // Use COALESCE to only update if new value provided, else keep old
    const updateQuery = `
      UPDATE users
      SET
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        phone_number = COALESCE($3, phone_number),
        role = COALESCE($4, role),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, username, email, phone_number, role, created_at, updated_at
    `;

    const updateValues = [username, email, phone_number, updatedRole, targetUserId];

    const result = await client.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Edit User Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ======================
// Delete User (Self or Admin)
// ======================
export const deleteUser = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const loggedInUserRole = req.user.role;
    const targetUserId = req.params.id; 

    if (!targetUserId || typeof targetUserId !== 'string') {
         return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (loggedInUserId !== targetUserId && loggedInUserRole !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. You can only delete your own profile or must be an admin.',
      });
    }

    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User deleted successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ====================== Forgot Password (Generate OTP) smtp ==============
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await client.query(
      'UPDATE users SET otp = $1, otp_expiry = $2 WHERE id = $3',
      [otp, otpExpiry, user.id]
    );

    // Setup nodemailer transporter using .env credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your OTP for Password Reset',
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ====================== verify OTP and reset password ======================
export const verifyOtpAndResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expiry > NOW()',
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await client.query(
      'UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


// ======================
// Get Authenticated User (Auto Auth)
// ======================
export const getMe = async (req, res) => {
  try {
    console.log('req.user:', req.user);
    const userId = req.user.userId;

    const result = await client.query(
      'SELECT id, role, username, email, phone_number, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Auto-auth Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//Get All Users
export const getAllUsers = async (req, res) => {
  try {
    // Ensure req.user is available and the role is 'admin'
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const result = await client.query(
      'SELECT id, role, username, email, phone_number, created_at FROM users'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


