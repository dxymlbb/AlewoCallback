import express from 'express';
import {
  getSubdomains,
  createRandomSubdomain,
  createCustomSubdomain,
  deleteSubdomain,
  toggleSubdomain
} from '../controllers/subdomainController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getSubdomains);
router.post('/random', createRandomSubdomain);
router.post('/custom', createCustomSubdomain);
router.delete('/:id', deleteSubdomain);
router.patch('/:id/toggle', toggleSubdomain);

export default router;
