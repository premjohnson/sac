import express from 'express';
import {
  registerStudent,
  getRegisteredStudents,
  updateAttendance,
  getStudentEventSummary,
  getAdminEventSummary,
  getOverallEventSummary
} from '../controller/registrationInfo.js';

import { authenticateToken } from '../middleware/protectRoute.js';

const router = express.Router();

// 📥 Register a student to an event
router.post('/register', authenticateToken, registerStudent);

// 📋 Get all students registered for a specific event (Admin view)
router.get('/event/:eventId/registrations', authenticateToken, getRegisteredStudents);

// ✅ Update attendance status for a registered student (Admin action)
router.put('/attendance/:registrationId', authenticateToken, updateAttendance);

// 🧾 Get student’s own event participation summary
router.get('/summary/student/:studentId', authenticateToken, getStudentEventSummary);

// 📊 Get admin summary for a specific event
router.get('/summary/event/:eventId', authenticateToken, getAdminEventSummary);

// 📊 Get overall summary across all events (dashboard)
router.get('/summary/overall', authenticateToken, getOverallEventSummary);

export default router;