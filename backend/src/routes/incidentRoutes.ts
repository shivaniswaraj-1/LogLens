import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  addNote,
  assign,
  create,
  detail,
  events,
  list,
  update,
  updateStatus,
} from '../controllers/incidentController';

const router = Router();

router.use(requireAuth);
router.post('/', create);
router.get('/', list);
router.get('/:id', detail);
router.patch('/:id', update);
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', assign);
router.post('/:id/notes', addNote);
router.get('/:id/events', events);

export default router;
