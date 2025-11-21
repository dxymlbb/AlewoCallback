import mongoose from 'mongoose';

const dnsQuerySchema = new mongoose.Schema({
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
  query: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['A', 'AAAA', 'TXT', 'MX', 'CNAME', 'NS', 'SOA', 'PTR', 'ANY'],
    default: 'A'
  },
  sourceIP: {
    type: String,
    required: true
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
dnsQuerySchema.index({ subdomainId: 1, timestamp: -1 });
dnsQuerySchema.index({ userId: 1, timestamp: -1 });
dnsQuerySchema.index({ timestamp: 1 }); // For cleanup

export default mongoose.model('DNSQuery', dnsQuerySchema);
