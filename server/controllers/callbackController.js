import Callback from '../models/Callback.js';
import Subdomain from '../models/Subdomain.js';

// Get callbacks for a subdomain
export const getCallbacks = async (req, res) => {
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

    const callbacks = await Callback.find({ subdomainId })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(callbacks);
  } catch (error) {
    console.error('Get callbacks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all callbacks for user
export const getAllCallbacks = async (req, res) => {
  try {
    const callbacks = await Callback.find({ userId: req.user._id })
      .populate('subdomainId', 'subdomain')
      .sort({ timestamp: -1 })
      .limit(200);

    res.json(callbacks);
  } catch (error) {
    console.error('Get all callbacks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete callback
export const deleteCallback = async (req, res) => {
  try {
    const callback = await Callback.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!callback) {
      return res.status(404).json({ message: 'Callback not found' });
    }

    await callback.deleteOne();
    res.json({ message: 'Callback deleted successfully' });
  } catch (error) {
    console.error('Delete callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear all callbacks for a subdomain
export const clearCallbacks = async (req, res) => {
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
    res.json({ message: 'Callbacks cleared successfully' });
  } catch (error) {
    console.error('Clear callbacks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
