import Subdomain from '../models/Subdomain.js';
import Callback from '../models/Callback.js';
import DNSQuery from '../models/DNSQuery.js';
import Script from '../models/Script.js';

export const startSubdomainCleanup = () => {
  // Run cleanup every minute
  setInterval(async () => {
    try {
      // Find expired subdomains
      const expiredSubdomains = await Subdomain.find({
        expiresAt: { $lt: new Date() },
        autoDelete: true
      });

      if (expiredSubdomains.length > 0) {
        console.log(`Found ${expiredSubdomains.length} expired subdomain(s)`);

        for (const subdomain of expiredSubdomains) {
          // Delete related callbacks
          await Callback.deleteMany({ subdomainId: subdomain._id });

          // Delete related DNS queries
          await DNSQuery.deleteMany({ subdomainId: subdomain._id });

          // Delete related scripts
          await Script.deleteMany({ subdomainId: subdomain._id });

          // Delete subdomain
          await subdomain.deleteOne();

          console.log(`✓ Cleaned up expired subdomain: ${subdomain.subdomain}`);
        }

        console.log(`✓ Cleaned up ${expiredSubdomains.length} expired subdomain(s)`);
      }
    } catch (error) {
      console.error('✗ Subdomain cleanup service error:', error);
    }
  }, 60000); // Run every 60 seconds

  console.log('✓ Subdomain cleanup service started (10 min auto-delete)');
};
