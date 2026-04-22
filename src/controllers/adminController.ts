import { Request, Response } from 'express';
import User from '../models/User';
import Movie from '../models/Movie';
import Category from '../models/Category';

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [moviesCount, usersCount, categoriesCount, totalViews] = await Promise.all([
      Movie.countDocuments(),
      User.countDocuments(),
      Category.countDocuments(),
      Movie.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    ]);

    res.json({
      movies: moviesCount,
      users: usersCount,
      categories: categoriesCount,
      views: totalViews[0]?.total || 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!['User', 'Admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (req.user._id.toString() === userId) {
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
