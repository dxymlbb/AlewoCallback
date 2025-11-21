import express from 'express';
import {
  getScripts,
  generateScript,
  createCustomScript,
  deleteScript,
  getTemplates
} from '../controllers/scriptController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/templates', getTemplates);
router.get('/subdomain/:subdomainId', getScripts);
router.post('/generate', generateScript);
router.post('/custom', createCustomScript);
router.delete('/:id', deleteScript);

export default router;
