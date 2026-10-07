import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  tradeId: { type: String, required: true, unique: true },
  client: { type: String, required: true },
  symbol: { type: String, required: true, index: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, required: true, index: true },
});

export default mongoose.model('Trade', tradeSchema);
