import Subdomain from '../models/Subdomain.js';
import { generateRandomSubdomain, validateSubdomain } from '../utils/generateSubdomain.js';

// Get all user subdomains
export const getSubdomains = async (req, res) => {
  try {
    const subdomains = await Subdomain.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(subdomains);
  } catch (error) {
    console.error('Get subdomains error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create random subdomain
export const createRandomSubdomain = async (req, res) => {
  try {
    let subdomain;
    let exists = true;
    let attempts = 0;

    // Try to generate a unique subdomain
    while (exists && attempts < 10) {
      subdomain = generateRandomSubdomain();
      exists = await Subdomain.findOne({ subdomain });
      attempts++;
    }

    if (exists) {
      return res.status(500).json({ message: 'Failed to generate unique subdomain' });
    }

    const newSubdomain = await Subdomain.create({
      userId: req.user._id,
      subdomain,
      isCustom: false
    });

    res.status(201).json(newSubdomain);
  } catch (error) {
    console.error('Create random subdomain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create custom subdomain
export const createCustomSubdomain = async (req, res) => {
  try {
    const { subdomain, expiryMinutes } = req.body;

    if (!subdomain) {
      return res.status(400).json({ message: 'Subdomain is required' });
    }

    // Validate subdomain format
    if (!validateSubdomain(subdomain)) {
      return res.status(400).json({
        message: 'Invalid subdomain format. Must be 3-63 characters, alphanumeric and hyphens only, start with a letter'
      });
    }

    // Validate expiry minutes
    let expiry = 10; // Default 10 minutes
    if (expiryMinutes) {
      const parsed = parseInt(expiryMinutes);
      if (isNaN(parsed) || parsed < 1 || parsed > 10080) {
        return res.status(400).json({
          message: 'Invalid expiry time. Must be between 1 and 10080 minutes (7 days)'
        });
      }
      expiry = parsed;
    }

    // Check if subdomain exists
    const exists = await Subdomain.findOne({ subdomain: subdomain.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Subdomain already taken' });
    }

    const newSubdomain = await Subdomain.create({
      userId: req.user._id,
      subdomain: subdomain.toLowerCase(),
      isCustom: true,
      expiresAt: new Date(Date.now() + expiry * 60 * 1000)
    });

    res.status(201).json(newSubdomain);
  } catch (error) {
    console.error('Create custom subdomain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete subdomain
export const deleteSubdomain = async (req, res) => {
  try {
    const subdomain = await Subdomain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    await subdomain.deleteOne();
    res.json({ message: 'Subdomain deleted successfully' });
  } catch (error) {
    console.error('Delete subdomain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle subdomain active status
export const toggleSubdomain = async (req, res) => {
  try {
    const subdomain = await Subdomain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    subdomain.isActive = !subdomain.isActive;
    await subdomain.save();

    res.json(subdomain);
  } catch (error) {
    console.error('Toggle subdomain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
