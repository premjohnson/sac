// src/routes/event.routes.js
import express from 'express';
import { upload } from '../middleware/multerMiddleware.js';
import { createEvent, getAllEvents, getEventById, deleteEventById, updateEventById, cancelEventById } from '../controller/eventsDir.js';
import { authenticateToken } from '../middleware/protectRoute.js';


const router = express.Router();

// POST /api/events
router.post('/create', authenticateToken, upload.array('files', 5), createEvent);

router.get('/allevents', getAllEvents);

router.get('/geteventbyid/:id', getEventById);

router.delete('/deleteevent/:id', authenticateToken, deleteEventById);

router.put('/updateevent/:id', authenticateToken, upload.array('files', 5), updateEventById);

router.post('/cancelevent/:id', authenticateToken, cancelEventById);

export default router;