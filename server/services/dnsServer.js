import dns2 from 'dns2';
import Subdomain from '../models/Subdomain.js';
import DNSQuery from '../models/DNSQuery.js';
import { getGeolocation } from '../utils/geolocation.js';

const { Packet, UDPClient } = dns2;

// DNS RCODE constants (for dns2 v2.x compatibility)
const RCODE = {
  NOERROR: 0,
  FORMERR: 1,
  SERVFAIL: 2,
  NXDOMAIN: 3,
  NOTIMP: 4,
  REFUSED: 5
};

// DNS Type Name Mapping (reverse lookup for logging)
const DNS_TYPE_NAMES = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  255: 'ANY'
};

// Get server IP from environment or detect
const getServerIP = () => {
  return process.env.SERVER_IP || '127.0.0.1';
};

// Extract subdomain from DNS query
const extractSubdomain = (queryName, baseDomain) => {
  if (!queryName || !baseDomain) return null;

  // Remove trailing dot if exists
  const name = queryName.endsWith('.') ? queryName.slice(0, -1) : queryName;
  const base = baseDomain.endsWith('.') ? baseDomain.slice(0, -1) : baseDomain;

  // Check if query matches base domain pattern
  const regex = new RegExp(`^(.+)\\.${base.replace(/\./g, '\\.')}$`, 'i');
  const match = name.match(regex);

  if (match && match[1]) {
    // Extract the first label (subdomain)
    const parts = match[1].split('.');
    return parts[0].toLowerCase();
  }

  return null;
};

export const startDNSServer = (io) => {
  const baseDomain = process.env.BASE_DOMAIN || 'callback.local';
  const serverIP = getServerIP();
  const dnsPort = process.env.DNS_PORT || 53;

  const server = dns2.createServer({
    udp: true,
    tcp: false,
    handle: async (request, send, rinfo) => {
      const response = Packet.createResponseFromRequest(request);
      const [question] = request.questions;
      const { name, type } = question;

      console.log(`DNS Query: ${name} (${DNS_TYPE_NAMES[type] || type}) from ${rinfo.address}`);

      try {
        // Extract subdomain from query
        const subdomainStr = extractSubdomain(name, baseDomain);

        if (subdomainStr) {
          try {
            // Find subdomain in database
            const subdomain = await Subdomain.findOne({
              subdomain: subdomainStr,
              isActive: true,
              expiresAt: { $gt: new Date() } // Not expired
            });

            if (subdomain) {
              // Get geolocation from source IP
              const geolocation = getGeolocation(rinfo.address);

              // Log DNS query to database
              const dnsQuery = await DNSQuery.create({
                subdomainId: subdomain._id,
                userId: subdomain.userId,
                query: name,
                queryType: DNS_TYPE_NAMES[type] || `UNKNOWN(${type})`,
                sourceIP: rinfo.address,
                geolocation,
                response: serverIP,
                timestamp: new Date()
              });

              // Update subdomain last activity
              subdomain.lastActivity = new Date();
              await subdomain.save();

              // Emit socket event for real-time update
              if (io) {
                io.to(`user_${subdomain.userId}`).emit('newDNSQuery', {
                  subdomainId: subdomain._id,
                  query: dnsQuery
                });
              }

              console.log(`✓ DNS query logged for subdomain: ${subdomainStr}`);
            } else {
              console.log(`⚠ DNS query for unknown/expired subdomain: ${subdomainStr}`);
            }
          } catch (dbError) {
            console.error(`✗ Database error processing DNS query for ${subdomainStr}:`, dbError.message);
            // Continue to send DNS response even if database logging fails
          }
        }

        // Always respond with A record pointing to our server
        if (type === Packet.TYPE.A) {
          response.answers.push({
            name,
            type: Packet.TYPE.A,
            class: Packet.CLASS.IN,
            ttl: 300,
            address: serverIP
          });
        } else if (type === Packet.TYPE.AAAA) {
          // IPv6 - return NODATA
          response.header.rcode = RCODE.NOERROR;
        } else if (type === Packet.TYPE.TXT) {
          response.answers.push({
            name,
            type: Packet.TYPE.TXT,
            class: Packet.CLASS.IN,
            ttl: 300,
            data: ['AlewoCallback DNS Server']
          });
        } else {
          // For other types, return NODATA
          response.header.rcode = RCODE.NOERROR;
        }

      } catch (error) {
        console.error('DNS Server Error:', error);
        response.header.rcode = RCODE.SERVFAIL;
      }

      send(response);
    }
  });

  // Start DNS server
  server.on('listening', () => {
    console.log(`✓ DNS Server listening on port ${dnsPort} (UDP)`);
    console.log(`✓ Base domain: ${baseDomain}`);
    console.log(`✓ Server IP: ${serverIP}`);
  });

  server.on('error', (err) => {
    console.error('✗ DNS Server Error:', err);
    if (err.code === 'EACCES') {
      console.error('✗ DNS requires root/sudo to bind to port 53');
      console.error('  Run with: sudo node server/index.js');
    }
  });

  try {
    server.listen({
      udp: { port: dnsPort, type: 'udp4' }
    });
  } catch (error) {
    console.error('✗ Failed to start DNS server:', error);
  }

  return server;
};
