import { Request, Response } from 'express';
import Movie from '../models/Movie';

export const getMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;

    const filter: any = {};
    if (category) filter.category = category;

    const movies = await Movie.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Movie.countDocuments(filter);

    res.json({
      movies,
      hasMore: page * limit < total,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getFeatured = async (_req: Request, res: Response): Promise<void> => {
  try {
    const movies = await Movie.find()
      .populate('category')
      .sort({ views: -1, rating: -1 })
      .limit(5);

    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getMovieById = async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id).populate('category');

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Increment views
    movie.views += 1;
    await movie.save();

    res.json(movie);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const searchMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query) {
      res.json([]);
      return;
    }

    const movies = await Movie.find({
      title: { $regex: query, $options: 'i' },
    })
      .populate('category')
      .limit(20);

    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category, videoUrl, thumbnailUrl, duration, rating } = req.body;

    if (!title || !description || !category || !videoUrl || !thumbnailUrl || !duration) {
      res.status(400).json({ message: 'Please provide all required fields' });
      return;
    }

    const movie = await Movie.create({
      title,
      description,
      category,
      videoUrl,
      thumbnailUrl,
      duration: Number(duration),
      rating: rating ? Number(rating) : 0,
    });

    const populated = await movie.populate('category');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category');

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    res.json(movie);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    res.json({ message: 'Movie deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
