import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
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
// Editing title/description/severity and (re)assigning are triage decisions,
// so they're limited to admins. Any engineer can still work an incident:
// move it through statuses and add notes.
router.patch('/:id', requireRole('ADMIN'), update);
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', requireRole('ADMIN'), assign);
router.post('/:id/notes', addNote);
router.get('/:id/events', events);

export default router;
