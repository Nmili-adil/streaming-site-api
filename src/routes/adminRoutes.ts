import { Router } from 'express';
import { getStats, getUsers, updateUserRole, deleteUser } from '../controllers/adminController';
import { protect, admin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, admin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

export default router;
