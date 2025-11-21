import Script from '../models/Script.js';
import Subdomain from '../models/Subdomain.js';
import { scriptTemplates, getMimeType } from '../templates/scriptTemplates.js';
import { nanoid } from 'nanoid';

// Get all scripts for a subdomain
export const getScripts = async (req, res) => {
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

    const scripts = await Script.find({
      subdomainId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json(scripts);
  } catch (error) {
    console.error('Get scripts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate script from template
export const generateScript = async (req, res) => {
  try {
    const { subdomainId, template, fileFormat } = req.body;

    if (!subdomainId || !template || !fileFormat) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify subdomain belongs to user
    const subdomain = await Subdomain.findOne({
      _id: subdomainId,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    // Check if template exists
    if (!scriptTemplates[template] || !scriptTemplates[template][fileFormat]) {
      return res.status(400).json({ message: 'Invalid template or file format' });
    }

    // Generate callback URL
    const baseDomain = process.env.BASE_DOMAIN || 'callback.local';
    const protocol = process.env.SSL_ENABLED === 'true' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${subdomain.subdomain}.${baseDomain}`;

    // Generate script content
    const content = scriptTemplates[template][fileFormat](callbackUrl);

    // Generate random filename
    const randomName = nanoid(8).toLowerCase();
    const filename = `${randomName}.${fileFormat}`;

    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + (parseInt(process.env.FILE_CLEANUP_TIME) || 5) * 60 * 1000);

    // Create script
    const script = await Script.create({
      subdomainId,
      userId: req.user._id,
      filename,
      content,
      mimeType: getMimeType(fileFormat),
      template,
      fileFormat,
      expiresAt
    });

    res.status(201).json(script);
  } catch (error) {
    console.error('Generate script error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create custom script
export const createCustomScript = async (req, res) => {
  try {
    const { subdomainId, filename, content, fileFormat } = req.body;

    if (!subdomainId || !filename || !content || !fileFormat) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify subdomain belongs to user
    const subdomain = await Subdomain.findOne({
      _id: subdomainId,
      userId: req.user._id
    });

    if (!subdomain) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    // Validate filename format
    const filenameRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
    if (!filenameRegex.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (parseInt(process.env.FILE_CLEANUP_TIME) || 5) * 60 * 1000);

    // Create script
    const script = await Script.create({
      subdomainId,
      userId: req.user._id,
      filename,
      content,
      mimeType: getMimeType(fileFormat),
      template: 'custom',
      fileFormat,
      expiresAt
    });

    res.status(201).json(script);
  } catch (error) {
    console.error('Create custom script error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete script
export const deleteScript = async (req, res) => {
  try {
    const script = await Script.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    await script.deleteOne();
    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Delete script error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available templates
export const getTemplates = async (req, res) => {
  try {
    const templates = Object.keys(scriptTemplates).map(category => ({
      category,
      formats: Object.keys(scriptTemplates[category])
    }));

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
