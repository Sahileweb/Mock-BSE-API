import mongoose from 'mongoose';

const pullSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'IN_PROGRESS' },
  startedAt: { type: Date, default: Date.now },
  expectedAt: Date,
  completedAt: Date,
  received: { type: Number, default: 0 },
  newTrades: { type: Number, default: 0 },
  error: String,
});

export default mongoose.model('Pull', pullSchema);
