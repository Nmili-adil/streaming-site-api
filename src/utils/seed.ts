import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/User';
import Category from '../models/Category';
import Movie from '../models/Movie';

dotenv.config();

const categories = [
  { name: 'Action', slug: 'action' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Horror', slug: 'horror' },
  { name: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Documentary', slug: 'documentary' },
];

const sampleMovies = [
  { title: 'The Last Frontier', description: 'An epic tale of survival in the wilderness, where a group of explorers must navigate treacherous terrain and their own inner demons.', duration: 7200, rating: 4.8, views: 15000 },
  { title: 'Neon Shadows', description: 'In a cyberpunk city, a hacker uncovers a conspiracy that could change the world forever.', duration: 6600, rating: 4.5, views: 12000 },
  { title: 'Crimson Depths', description: 'A deep-sea expedition goes terribly wrong when the crew encounters something ancient beneath the ocean floor.', duration: 5400, rating: 4.2, views: 9800 },
  { title: 'Echoes of Tomorrow', description: 'A scientist discovers a way to communicate with her future self, but every message changes the timeline.', duration: 7800, rating: 4.7, views: 18000 },
  { title: 'Silent Revolution', description: 'A gripping political thriller set in a fictional country on the brink of a major upheaval.', duration: 6000, rating: 4.3, views: 8500 },
  { title: 'Midnight Express', description: 'A young journalist stumbles upon a decades-old mystery aboard a cross-country train.', duration: 5700, rating: 4.1, views: 7200 },
  { title: 'Beyond the Stars', description: 'Humanity\'s first interstellar mission encounters a civilization that challenges everything we know about the universe.', duration: 8400, rating: 4.9, views: 25000 },
  { title: 'The Forgotten Garden', description: 'A woman inherits her grandmother\'s estate and discovers a hidden garden with magical properties.', duration: 6300, rating: 4.4, views: 11000 },
  { title: 'Vendetta Rising', description: 'An ex-agent comes out of retirement to track down the criminal organization that destroyed her family.', duration: 7500, rating: 4.6, views: 14000 },
  { title: 'Parallel Lives', description: 'Two strangers connected across parallel universes must work together to prevent a catastrophe.', duration: 6900, rating: 4.5, views: 16000 },
];

const thumbnails = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1518676590747-1e3dcf5a05be?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop',
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/streamproject';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Movie.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@streamx.com',
      password: hashedPassword,
      role: 'Admin',
      subscriptionStatus: 'Active',
    });
    console.log(`Created admin user: ${adminUser.email} / admin123`);

    // Create test user
    const userPassword = await bcrypt.hash('user123', salt);
    const testUser = await User.create({
      name: 'Test User',
      email: 'user@streamx.com',
      password: userPassword,
      role: 'User',
      subscriptionStatus: 'Active',
    });
    console.log(`Created test user: ${testUser.email} / user123`);

    // Create categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`Created ${createdCategories.length} categories`);

    // Create movies
    const movies = sampleMovies.map((movie, index) => ({
      ...movie,
      category: createdCategories[index % createdCategories.length]._id,
      thumbnailUrl: thumbnails[index],
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    }));

    const createdMovies = await Movie.insertMany(movies);
    console.log(`Created ${createdMovies.length} movies`);

    // Add some movies to test user's watchlist & history via updateOne to avoid subdocument typing
    await User.updateOne(
      { _id: testUser._id },
      {
        $set: {
          watchlist: createdMovies.slice(0, 3).map((m) => m._id),
          watchHistory: [
            { movieId: createdMovies[0]._id, progress: 45, lastWatched: new Date() },
            { movieId: createdMovies[1]._id, progress: 72, lastWatched: new Date(Date.now() - 86400000) },
          ],
        },
      }
    );
    console.log('Added watchlist and watch history to test user');

    console.log('\n--- Seed Complete ---');
    console.log('Admin: admin@streamx.com / admin123');
    console.log('User:  user@streamx.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
