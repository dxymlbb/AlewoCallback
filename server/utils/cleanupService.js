import Script from '../models/Script.js';

export const startCleanupService = () => {
  // Run cleanup every minute
  setInterval(async () => {
    try {
      const result = await Script.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        console.log(`✓ Cleaned up ${result.deletedCount} expired script(s)`);
      }
    } catch (error) {
      console.error('✗ Cleanup service error:', error);
    }
  }, 60000); // Run every 60 seconds

  console.log('✓ Cleanup service started');
};
