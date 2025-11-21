import mongoose from 'mongoose';

const scriptSchema = new mongoose.Schema({
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
  filename: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    default: 'text/plain'
  },
  template: {
    type: String,
    default: 'custom'
  },
  fileFormat: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for cleanup and queries
scriptSchema.index({ expiresAt: 1 });
scriptSchema.index({ subdomainId: 1, filename: 1 });

export default mongoose.model('Script', scriptSchema);
