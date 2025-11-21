import express from 'express';
import {
  getInteractions,
  getAllInteractions,
  exportInteractions,
  clearInteractions
} from '../controllers/interactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllInteractions);
router.get('/subdomain/:subdomainId', getInteractions);
router.get('/subdomain/:subdomainId/export', exportInteractions);
router.delete('/subdomain/:subdomainId/clear', clearInteractions);

export default router;
