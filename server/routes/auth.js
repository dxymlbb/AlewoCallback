import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Registration is disabled - users must be created by admin during installation
// router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
