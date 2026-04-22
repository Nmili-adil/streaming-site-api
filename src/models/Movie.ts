import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  views: { type: Number, default: 0 },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Movie', movieSchema);
