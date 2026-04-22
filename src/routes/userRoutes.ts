import { Router } from 'express';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getWatchHistory,
  updateWatchHistory,
} from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

// Watchlist
router.get('/watchlist', getWatchlist);
router.post('/watchlist/:movieId', addToWatchlist);
router.delete('/watchlist/:movieId', removeFromWatchlist);

// Watch History
router.get('/watch-history', getWatchHistory);
router.post('/watch-history/:movieId', updateWatchHistory);

export default router;
