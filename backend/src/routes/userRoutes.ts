import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { list } from '../controllers/userController';

const router = Router();

// requireRole refreshes req.user.role from the database, so the controller's
// email-visibility check isn't based on a stale JWT claim.
router.use(requireAuth, requireRole('ADMIN', 'ENGINEER'));
router.get('/', list);

export default router;
