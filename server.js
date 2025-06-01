import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './src/config/connection.js';
import userRoutes from './src/routes/userRoutes.js';  // Import your user routes

dotenv.config();

const app = express();

// Connect to the database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,  // allow frontend origin
  credentials: true,                 // allow cookies to be sent cross-origin
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the SAC Server!');
});

// Mount user routes under /api/users
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
