import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { detail, list, logsForPattern } from '../controllers/errorPatternController';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.get('/:id', detail);
router.get('/:id/logs', logsForPattern);

export default router;
