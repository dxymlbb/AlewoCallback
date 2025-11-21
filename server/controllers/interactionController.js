import Callback from '../models/Callback.js';
import DNSQuery from '../models/DNSQuery.js';
import Subdomain from '../models/Subdomain.js';

// Get all interactions (DNS + HTTP) for a subdomain
export const getInteractions = async (req, res) => {
  try {
    const { subdomainId } = req.params;

    // Verify subdomain belongs to user
    const subdomain = await Subdomain.findOne({
      _id: subdomainId,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    // Get all callbacks
    const callbacks = await Callback.find({ subdomainId })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    // Get all DNS queries
    const dnsQueries = await DNSQuery.find({ subdomainId })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    // Combine and sort by timestamp
    const interactions = [
      ...callbacks.map(c => ({ ...c, type: 'HTTP' })),
      ...dnsQueries.map(d => ({ ...d, type: 'DNS' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(interactions);
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all interactions for user (all subdomains)
export const getAllInteractions = async (req, res) => {
  try {
    const { search, type, startDate, endDate } = req.query;

    // Build query
    let query = { userId: req.user._id };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get callbacks
    let callbacks = [];
    let dnsQueries = [];

    if (!type || type === 'HTTP') {
      callbacks = await Callback.find(query)
        .populate('subdomainId', 'subdomain')
        .sort({ timestamp: -1 })
        .limit(200)
        .lean();
    }

    if (!type || type === 'DNS') {
      dnsQueries = await DNSQuery.find(query)
        .populate('subdomainId', 'subdomain')
        .sort({ timestamp: -1 })
        .limit(200)
        .lean();
    }

    // Combine
    let interactions = [
      ...callbacks.map(c => ({ ...c, type: 'HTTP' })),
      ...dnsQueries.map(d => ({ ...d, type: 'DNS' }))
    ];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      interactions = interactions.filter(i => {
        if (i.type === 'HTTP') {
          return (
            i.path?.toLowerCase().includes(searchLower) ||
            i.method?.toLowerCase().includes(searchLower) ||
            i.ip?.toLowerCase().includes(searchLower) ||
            i.userAgent?.toLowerCase().includes(searchLower)
          );
        } else {
          return (
            i.query?.toLowerCase().includes(searchLower) ||
            i.sourceIP?.toLowerCase().includes(searchLower) ||
            i.type?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Sort by timestamp
    interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(interactions);
  } catch (error) {
    console.error('Get all interactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export interactions
export const exportInteractions = async (req, res) => {
  try {
    const { subdomainId } = req.params;
    const { format = 'json' } = req.query;

    // Verify subdomain belongs to user
    const subdomain = await Subdomain.findOne({
      _id: subdomainId,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    // Get all interactions
    const callbacks = await Callback.find({ subdomainId }).sort({ timestamp: 1 }).lean();
    const dnsQueries = await DNSQuery.find({ subdomainId }).sort({ timestamp: 1 }).lean();

    const interactions = [
      ...callbacks.map(c => ({ ...c, type: 'HTTP' })),
      ...dnsQueries.map(d => ({ ...d, type: 'DNS' }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${subdomain.subdomain}-interactions.json"`);
      res.json(interactions);
    } else if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(interactions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${subdomain.subdomain}-interactions.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Invalid format. Use json or csv' });
    }
  } catch (error) {
    console.error('Export interactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to convert to CSV
const convertToCSV = (interactions) => {
  const headers = ['Type', 'Timestamp', 'Source IP', 'Country', 'City', 'Details'];
  const rows = interactions.map(i => {
    const timestamp = new Date(i.timestamp).toISOString();
    const sourceIP = i.type === 'HTTP' ? i.ip : i.sourceIP;
    const country = i.geolocation?.country || '';
    const city = i.geolocation?.city || '';
    const details = i.type === 'HTTP'
      ? `${i.method} ${i.path}`
      : `${i.queryType || 'UNKNOWN'} ${i.query}`;

    return [i.type, timestamp, sourceIP, country, city, details].map(field =>
      `"${String(field || '').replace(/"/g, '""')}"`
    ).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

// Delete all interactions for a subdomain
export const clearInteractions = async (req, res) => {
  try {
    const { subdomainId } = req.params;

    // Verify subdomain belongs to user
    const subdomain = await Subdomain.findOne({
      _id: subdomainId,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    await Callback.deleteMany({ subdomainId });
    await DNSQuery.deleteMany({ subdomainId });

    res.json({ message: 'All interactions cleared' });
  } catch (error) {
    console.error('Clear interactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
