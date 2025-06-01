import express from 'express';
import { registerUser, loginUser, getMe } from '../controller/userAuthController.js';
import { authenticateToken } from '../middleware/protectRoute.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
// No auth needed to login
router.post('/login', loginUser);

// Auth required to getMe
router.get('/me', authenticateToken, getMe);


export default router;
