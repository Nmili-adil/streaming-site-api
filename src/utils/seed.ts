import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/User';
import Category from '../models/Category';
import Movie from '../models/Movie';

dotenv.config();

const TMDB_KEY  = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';

const VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

const EXTRA_USERS = [
  { name: 'Alice Moreau',  email: 'alice@streamx.com',  password: 'alice123',  subscriptionStatus: 'Active'   },
  { name: 'Carlos Rivera', email: 'carlos@streamx.com', password: 'carlos123', subscriptionStatus: 'Active'   },
  { name: 'Yuki Tanaka',   email: 'yuki@streamx.com',   password: 'yuki123',   subscriptionStatus: 'Inactive' },
  { name: 'Fatima Nasser', email: 'fatima@streamx.com', password: 'fatima123', subscriptionStatus: 'Active'   },
  { name: 'Leo Braun',     email: 'leo@streamx.com',    password: 'leo123',    subscriptionStatus: 'Inactive' },
  { name: 'Priya Sharma',  email: 'priya@streamx.com',  password: 'priya123',  subscriptionStatus: 'Active'   },
];

async function tmdbGet(path: string): Promise<any> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seed() {
  if (!TMDB_KEY) {
    console.error('TMDB_API_KEY is missing from .env');
    process.exit(1);
  }

  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      'mongodb://127.0.0.1:27017/streamproject';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Movie.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Genres -> Categories
    const { genres } = await tmdbGet('/genre/movie/list?language=en');
    const categoryDocs = await Category.insertMany(
      genres.map((g: any) => ({
        name: g.name,
        slug: g.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      }))
    );
    const genreMap = new Map<number, mongoose.Types.ObjectId>(
      genres.map((g: any, i: number) => [g.id, categoryDocs[i]._id])
    );
    console.log(`Created ${categoryDocs.length} categories from TMDB`);

    // Popular movies - 3 pages (~60 total)
    const rawMovies: any[] = [];
    for (let page = 1; page <= 3; page++) {
      const data = await tmdbGet(`/movie/popular?language=en-US&page=${page}`);
      rawMovies.push(...data.results);
      await pause(250);
    }
    console.log(`Fetched ${rawMovies.length} popular movies from TMDB`);

    // Fetch runtime per movie in batches of 10
    const runtimeMap = new Map<number, number>();
    for (let i = 0; i < rawMovies.length; i += 10) {
      const batch = rawMovies.slice(i, i + 10);
      const details = await Promise.all(
        batch.map((m: any) => tmdbGet(`/movie/${m.id}`).catch(() => null))
      );
      details.forEach((d: any) => {
        if (d?.runtime) runtimeMap.set(d.id, d.runtime * 60);
      });
      await pause(350);
      process.stdout.write(
        `  Details: ${Math.min(i + 10, rawMovies.length)}/${rawMovies.length}\r`
      );
    }
    console.log('\nMovie details fetched');

    // Build and insert movies
    const movieDocs = rawMovies
      .filter((m: any) => m.poster_path && m.overview)
      .map((m: any, i: number) => {
        const firstGenreId: number | undefined = m.genre_ids?.[0];
        const category =
          (firstGenreId !== undefined && genreMap.get(firstGenreId)) ||
          categoryDocs[i % categoryDocs.length]._id;
        return {
          title:        m.title,
          description:  m.overview,
          category,
          thumbnailUrl: `${IMG_BASE}${m.poster_path}`,
          videoUrl:     VIDEO_POOL[i % VIDEO_POOL.length],
          duration:     runtimeMap.get(m.id) ?? 5400,
          rating:       Math.round(m.vote_average * 10) / 10,
          views:        Math.floor(m.popularity * 100),
        };
      });

    const createdMovies = await Movie.insertMany(movieDocs);
    console.log(`Inserted ${createdMovies.length} movies`);

    // Users
    const salt = await bcrypt.genSalt(10);

    await User.create({
      name: 'Admin',
      email: 'admin@streamx.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'Admin',
      subscriptionStatus: 'Active',
    });

    const testUser = await User.create({
      name: 'Test User',
      email: 'user@streamx.com',
      password: await bcrypt.hash('user123', salt),
      role: 'User',
      subscriptionStatus: 'Active',
    });

    const createdExtras = await Promise.all(
      EXTRA_USERS.map(async (u) =>
        User.create({
          name: u.name,
          email: u.email,
          password: await bcrypt.hash(u.password, salt),
          role: 'User',
          subscriptionStatus: u.subscriptionStatus,
        })
      )
    );

    console.log(`Created ${2 + createdExtras.length} users`);

    // Watchlists & watch history
    const day = 86_400_000;

    await User.updateOne(
      { _id: testUser._id },
      {
        $set: {
          watchlist: createdMovies.slice(0, 8).map((m) => m._id),
          watchHistory: [
            { movieId: createdMovies[0]._id, progress: 45,  lastWatched: new Date() },
            { movieId: createdMovies[1]._id, progress: 72,  lastWatched: new Date(Date.now() - day) },
            { movieId: createdMovies[2]._id, progress: 100, lastWatched: new Date(Date.now() - 2 * day) },
            { movieId: createdMovies[3]._id, progress: 30,  lastWatched: new Date(Date.now() - 4 * day) },
            { movieId: createdMovies[4]._id, progress: 88,  lastWatched: new Date(Date.now() - 7 * day) },
          ],
        },
      }
    );

    await Promise.all(
      createdExtras.map((u, i) => {
        const off = (i + 1) * 4;
        return User.updateOne(
          { _id: u._id },
          {
            $set: {
              watchlist: createdMovies.slice(off, off + 5).map((m) => m._id),
              watchHistory: [
                { movieId: createdMovies[off]._id,     progress: Math.floor(Math.random() * 100), lastWatched: new Date(Date.now() - i * day) },
                { movieId: createdMovies[off + 1]._id, progress: Math.floor(Math.random() * 100), lastWatched: new Date(Date.now() - (i + 2) * day) },
                { movieId: createdMovies[off + 2]._id, progress: Math.floor(Math.random() * 100), lastWatched: new Date(Date.now() - (i + 5) * day) },
              ],
            },
          }
        );
      })
    );

    console.log('\n--- Seed Complete ---');
    console.log(`  Categories : ${categoryDocs.length}`);
    console.log(`  Movies     : ${createdMovies.length}`);
    console.log(`  Users      : ${2 + createdExtras.length} (1 admin + ${1 + createdExtras.length} regular)`);
    console.log('\nAccounts:');
    console.log('  admin@streamx.com  / admin123  [Admin]');
    console.log('  user@streamx.com   / user123   [User - Active]');
    EXTRA_USERS.forEach((u) =>
      console.log(`  ${u.email.padEnd(24)} / ${u.password.padEnd(10)} [User - ${u.subscriptionStatus}]`)
    );

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
