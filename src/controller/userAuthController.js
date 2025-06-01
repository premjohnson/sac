import bcrypt from 'bcrypt';
import { client } from '../config/connection.js';
import  generateTokenSetCookie  from '../utils/generate.js'; // token cookie setter

const saltRounds = 10;

// ======================
// Register User (No token generation here)
// ======================
export const registerUser = async (req, res) => {
  const { role, username, phone_number, email, password } = req.body;

  if (!role || !username || !phone_number || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await client.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2 OR phone_number = $3',
      [username, email, phone_number]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      `INSERT INTO users (role, username, phone_number, email, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, role, username, email`,
      [role, username, phone_number, email, hashedPassword]
    );

    const user = result.rows[0];

    // NO token generation here — user must login separately

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ======================
// Login User (Generate token here)
// ======================
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // This sets the cookie
generateTokenSetCookie(user.id, res);

    delete user.password;

    res.status(200).json({ message: 'Login successful', user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
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

