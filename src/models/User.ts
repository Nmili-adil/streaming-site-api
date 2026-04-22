import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  watchHistory: [{
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    progress: { type: Number, default: 0 },
    lastWatched: { type: Date, default: Date.now }
  }],
  watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  subscriptionStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
