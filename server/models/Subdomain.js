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
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    }
  },
  autoDelete: {
    type: Boolean,
    default: true
  }
});

// Index for faster queries
subdomainSchema.index({ userId: 1, createdAt: -1 });
// subdomain index is already created by unique: true on line 12
subdomainSchema.index({ expiresAt: 1 }); // For auto-cleanup

export default mongoose.model('Subdomain', subdomainSchema);
