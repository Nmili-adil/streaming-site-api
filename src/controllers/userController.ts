import { Request, Response } from 'express';
import User from '../models/User';
import Movie from '../models/Movie';

// ---- Watchlist ----

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'watchlist',
      populate: { path: 'category' },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user.watchlist);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;

    const movie = await Movie.findById(movieId).populate('category');
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if already in watchlist
    const alreadyInList = user.watchlist.some(
      (id: any) => id.toString() === movieId
    );

    if (alreadyInList) {
      res.status(400).json({ message: 'Movie already in watchlist' });
      return;
    }

    user.watchlist.push(movie._id as any);
    await user.save();

    res.status(201).json(movie);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.watchlist = user.watchlist.filter(
      (id: any) => id.toString() !== movieId
    );
    await user.save();

    res.json({ message: 'Removed from watchlist' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// ---- Watch History ----

export const getWatchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'watchHistory.movieId',
      populate: { path: 'category' },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Return formatted watch history with movie data
    const history = user.watchHistory
      .filter((entry: any) => entry.movieId) // filter out entries where movie was deleted
      .sort((a: any, b: any) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
      .map((entry: any) => ({
        movie: entry.movieId,
        progress: entry.progress,
        lastWatched: entry.lastWatched,
      }));

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateWatchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;
    const { progress } = req.body;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const existingEntry = user.watchHistory.find(
      (entry: any) => entry.movieId?.toString() === movieId
    );

    if (existingEntry) {
      existingEntry.progress = progress;
      existingEntry.lastWatched = new Date();
    } else {
      user.watchHistory.push({
        movieId: movie._id as any,
        progress,
        lastWatched: new Date(),
      });
    }

    await user.save();
    res.json({ message: 'Watch history updated' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
