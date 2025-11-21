import mongoose from 'mongoose';

const callbackSchema = new mongoose.Schema({
  subdomainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subdomain',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  headers: {
    type: Object,
    default: {}
  },
  query: {
    type: Object,
    default: {}
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  bodyRaw: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  protocol: {
    type: String,
    enum: ['http', 'https'],
    default: 'http'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
callbackSchema.index({ subdomainId: 1, timestamp: -1 });
callbackSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('Callback', callbackSchema);
