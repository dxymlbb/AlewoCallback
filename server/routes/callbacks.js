import express from 'express';
import {
  getCallbacks,
  getAllCallbacks,
  deleteCallback,
  clearCallbacks
} from '../controllers/callbackController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllCallbacks);
router.get('/subdomain/:subdomainId', getCallbacks);
router.delete('/:id', deleteCallback);
router.delete('/subdomain/:subdomainId/clear', clearCallbacks);

export default router;
