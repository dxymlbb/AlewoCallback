import mongoose from 'mongoose';

const subdomainSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
subdomainSchema.index({ userId: 1, createdAt: -1 });
subdomainSchema.index({ subdomain: 1 });

export default mongoose.model('Subdomain', subdomainSchema);
