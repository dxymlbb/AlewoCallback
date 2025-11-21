import geoip from 'geoip-lite';

/**
 * Get geolocation information from IP address
 * @param {string} ip - IP address
 * @returns {object} Geolocation data
 */
export const getGeolocation = (ip) => {
  if (!ip) {
    return {
      country: '',
      region: '',
      city: '',
      timezone: '',
      ll: [],
      range: []
    };
  }

  // Clean IP address (remove ::ffff: prefix for IPv4-mapped IPv6)
  let cleanIp = ip;
  if (ip.startsWith('::ffff:')) {
    cleanIp = ip.substring(7);
  }

  // Skip localhost and private IPs
  if (cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
    return {
      country: 'Local',
      region: 'Local',
      city: 'Localhost',
      timezone: '',
      ll: [],
      range: []
    };
  }

  const geo = geoip.lookup(cleanIp);

  if (!geo) {
    return {
      country: 'Unknown',
      region: '',
      city: '',
      timezone: '',
      ll: [],
      range: []
    };
  }

  return {
    country: geo.country || '',
    region: geo.region || '',
    city: geo.city || '',
    timezone: geo.timezone || '',
    ll: geo.ll || [],
    range: geo.range || []
  };
};
