import Script from '../models/Script.js';

export const startScriptCleanup = () => {
  // Run cleanup every minute
  setInterval(async () => {
    try {
      // Find expired scripts
      const expiredScripts = await Script.find({
        expiresAt: { $lt: new Date() }
      });

      if (expiredScripts.length > 0) {
        console.log(`Found ${expiredScripts.length} expired script(s)`);

        // Delete all expired scripts
        const result = await Script.deleteMany({
          expiresAt: { $lt: new Date() }
        });

        console.log(`✓ Cleaned up ${result.deletedCount} expired script(s)`);
      }
    } catch (error) {
      console.error('✗ Script cleanup service error:', error);
    }
  }, 60000); // Run every 60 seconds

  console.log('✓ Script cleanup service started (auto-delete expired files)');
};
