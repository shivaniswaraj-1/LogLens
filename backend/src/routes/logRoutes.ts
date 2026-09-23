import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadLogFile } from '../middleware/upload';
import { detail, ingest, list, services } from '../controllers/logController';

const router = Router();

router.use(requireAuth);
router.post('/ingest', uploadLogFile, ingest);
router.get('/', list);
router.get('/services', services);
router.get('/:id', detail);

export default router;
