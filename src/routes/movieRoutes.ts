import { Router } from 'express';
import {
  getMovies,
  getFeatured,
  getMovieById,
  searchMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} from '../controllers/movieController';
import { protect, admin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getMovies);
router.get('/featured', getFeatured);
router.get('/search', searchMovies);
router.get('/:id', getMovieById);

// Admin routes
router.post('/', protect, admin, createMovie);
router.put('/:id', protect, admin, updateMovie);
router.delete('/:id', protect, admin, deleteMovie);

export default router;
