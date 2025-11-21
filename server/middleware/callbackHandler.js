import Subdomain from '../models/Subdomain.js';
import Callback from '../models/Callback.js';
import Script from '../models/Script.js';

// Extract subdomain from hostname
const extractSubdomain = (hostname, baseDomain) => {
  if (!hostname) return null;

  // Remove port if present
  const host = hostname.split(':')[0];

  // Remove base domain to get subdomain
  const regex = new RegExp(`\\.?${baseDomain.replace('.', '\\.')}$`, 'i');
  const subdomain = host.replace(regex, '');

  // If subdomain is empty or equals the host, return null
  if (!subdomain || subdomain === host) return null;

  return subdomain.toLowerCase();
};

// Middleware to capture all callbacks
export const captureCallback = async (req, res, next) => {
  try {
    const baseDomain = process.env.BASE_DOMAIN || 'callback.local';
    const hostname = req.hostname || req.headers.host;
    const subdomainStr = extractSubdomain(hostname, baseDomain);

    // If no subdomain, this is the main domain - continue to next middleware
    if (!subdomainStr) {
      return next();
    }

    // Check if this is a script request
    const scriptMatch = req.path.match(/^\/script\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)$/);

    if (scriptMatch) {
      const filename = scriptMatch[1];

      // Find the script
      const subdomain = await Subdomain.findOne({ subdomain: subdomainStr, isActive: true });

      if (!subdomain) {
        return res.status(404).send('Subdomain not found');
      }

      const script = await Script.findOne({
        subdomainId: subdomain._id,
        filename,
        expiresAt: { $gt: new Date() }
      });

      if (!script) {
        return res.status(404).send('Script not found or expired');
      }

      // Increment access count
      script.accessCount += 1;
      await script.save();

      // Return the script content
      res.setHeader('Content-Type', script.mimeType);
      return res.send(script.content);
    }

    // Find the subdomain in database
    const subdomain = await Subdomain.findOne({ subdomain: subdomainStr, isActive: true });

    if (!subdomain) {
      return res.status(404).send('Subdomain not found or inactive');
    }

    // Capture the request body
    let bodyRaw = '';
    let body = null;

    if (req.body) {
      if (typeof req.body === 'string') {
        bodyRaw = req.body;
        try {
          body = JSON.parse(req.body);
        } catch (e) {
          body = req.body;
        }
      } else if (typeof req.body === 'object') {
        body = req.body;
        bodyRaw = JSON.stringify(req.body);
      }
    }

    // Create callback record
    const callback = await Callback.create({
      subdomainId: subdomain._id,
      userId: subdomain.userId,
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body,
      bodyRaw,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      protocol: req.protocol
    });

    // Update subdomain last activity
    subdomain.lastActivity = new Date();
    await subdomain.save();

    // Emit socket event if socket.io is available
    if (req.app.get('io')) {
      req.app.get('io').to(`user_${subdomain.userId}`).emit('newCallback', {
        subdomainId: subdomain._id,
        callback
      });
    }

    // Send response
    res.status(200).json({
      success: true,
      message: 'Callback received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Callback handler error:', error);
    res.status(500).send('Internal server error');
  }
};
