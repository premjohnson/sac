import express from 'express';
import { registerUser, loginUser, getMe ,editUser,deleteUser, getAllUsers, forgotPassword, verifyOtpAndResetPassword} from '../controller/userAuthController.js';
import { authenticateToken } from '../middleware/protectRoute.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
// No auth needed to login
router.post('/login', loginUser);

// Auth required to getMe
router.get('/me', authenticateToken, getMe);

//edit user 
router.put('/edit/:id', authenticateToken, editUser);
//delete user
router.delete('/delete/:id', authenticateToken, deleteUser);

router.get('/users', authenticateToken, getAllUsers);

router.post('/forgot-password', forgotPassword);

router.post('/verify-otp', verifyOtpAndResetPassword);


export default router;
