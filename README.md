# AlewoCallback

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-orange.svg)](https://ubuntu.com)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-6.0%2B-green.svg)](https://mongodb.com)
[![Security Testing](https://img.shields.io/badge/security-pentesting-red.svg)](https://github.com/your-org/AlewoCallback)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/your-org/AlewoCallback/pulls)

<br>

<pre>
╔═════════════════════════════════════════╗
║                                         ║
║     █████╗ ██╗     ███████╗██╗    ██╗  ║
║    ██╔══██╗██║     ██╔════╝██║    ██║  ║
║    ███████║██║     █████╗  ██║ █╗ ██║  ║
║    ██╔══██║██║     ██╔══╝  ██║███╗██║  ║
║    ██║  ██║███████╗███████╗╚███╔███╔╝  ║
║    ╚═╝  ╚═╝╚══════╝╚══════╝ ╚══╝╚══╝   ║
║                                         ║
║          CALLBACK PLATFORM v1.0         ║
║                                         ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                         ║
║  Out-of-Band Interaction Server         ║
║  Security Testing & Vulnerability Scan  ║
║                                         ║
║  ✓ DNS Query Logging (A/TXT/MX/NS)     ║
║  ✓ HTTP/HTTPS Request Capture          ║
║  ✓ Real-time IP Geolocation            ║
║  ✓ SSRF • XXE • SQLi Detection         ║
║                                         ║
╚═════════════════════════════════════════╝
</pre>

</div>

---

**AlewoCallback** is an open-source alternative to Burp Collaborator, developed by **Alewo Security**. It captures DNS queries and HTTP/HTTPS requests in real-time, helping security researchers detect blind vulnerabilities like SSRF, XXE, and SQL injection with complete infrastructure control.

The tool provides complete control over your callback infrastructure with automatic IP geolocation, script generation, and advanced interaction monitoring.

---

## Features

### **Deep Interaction Monitoring**
Unlike traditional callback services, AlewoCallback doesn't just log requests—it provides comprehensive context. Full DNS query type support (A, AAAA, TXT, MX, CNAME, NS, SOA, PTR), complete HTTP/HTTPS request capture with headers and body, and automatic IP geolocation with country, region, city, and coordinates.

### **Dynamic Subdomain Management**
Create random subdomains with automatic 10-minute expiration or custom subdomains with user-defined TTL (1 minute to 7 days). All interactions are tracked in a unified timeline with cascading cleanup when subdomains expire.

### **Script Generator**
Built-in payload generator with multiple templates: Shell scripts (bash, sh), backdoors (PHP, JSP, ASPX), command scripts (BAT, PowerShell, Python), web payloads (HTML, JavaScript, XML), and SQL injection payloads (MSSQL, MySQL, Oracle). Scripts auto-delete after 5 minutes for operational security.

### **Self-Hosted & Privacy-Focused**
Complete control over your infrastructure. No third-party logging, no data leakage to external services. JWT-based authentication with admin-only access, SSL/HTTPS support via Let's Encrypt, and secure password hashing with bcrypt.

### **Export & Analysis**
Export all interactions as JSON or CSV with full geolocation data. Search and filter by type, IP, method, or custom criteria. Real-time updates via WebSocket for instant notification of new interactions.

AlewoCallback currently supports HTTP/HTTPS protocols and DNS via a plugin-based system, making it straightforward to extend.

---

## Quick Start

### Prerequisites

- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **Resources**: 1GB RAM minimum (2GB+ recommended), 10GB disk space
- **Access**: Root or sudo privileges
- **Domain**: Custom domain with DNS access (optional, can use IP)

### Installation

One-command installation with interactive setup:

```bash
git clone https://github.com/your-org/AlewoCallback.git
cd AlewoCallback
sudo bash install.sh
```

The installer will:
- Install dependencies (Node.js 18+, MongoDB 6.0+, Nginx)
- Configure environment variables and SSL certificates
- Create administrator account with JWT authentication
- Setup DNS server (port 53) and HTTP/HTTPS server
- Configure firewall rules (UFW)
- Install `alewo-callback` management command globally

**Installation time**: 5-10 minutes

See **[Installation Guide](INSTALL.md)** for detailed instructions and troubleshooting.

### DNS Configuration (Required for DNS Logging)

⚠️ **Important**: To enable DNS query logging (like Burp Collaborator), you **must** configure NS delegation at your domain registrar.

After installation, the installer provides an **interactive NS delegation tutorial** customized for your domain. This step-by-step guide walks you through:

1. Creating child nameservers (glue records)
2. Changing domain nameservers to point to your server
3. Verifying DNS propagation
4. Testing DNS query logging

**Complete guides available:**
- **[NS Records Setup Guide](docs/NS-RECORDS-SETUP-GUIDE.md)** - Comprehensive NS delegation guide
- **[DNS Testing Guide](docs/DNS-TESTING-GUIDE.md)** - DNS verification and troubleshooting

Without NS delegation, only HTTP/HTTPS requests will be logged—DNS queries will not appear.

---

## Usage

### Management Commands

After installation, use the `alewo-callback` command:

```bash
# Start all services (HTTP, DNS, MongoDB)
sudo alewo-callback start

# Stop all services
sudo alewo-callback stop

# Restart all services
sudo alewo-callback restart

# Check service status (no sudo required)
alewo-callback status

# View logs
alewo-callback logs
alewo-callback logs -f              # Follow in real-time
alewo-callback logs --error         # Error logs only
alewo-callback logs -n 100          # Last 100 lines

# Uninstall (with backup option)
sudo alewo-callback uninstall
```

### Access Dashboard

- **With domain**: `https://yourdomain.com`
- **Without domain**: `http://YOUR_SERVER_IP`

Login with admin credentials created during installation.

### Creating Callback Subdomains

**Random Subdomain** (10-minute expiry):
1. Click **"Random"** button
2. Subdomain generated automatically (e.g., `abc123xyz.yourdomain.com`)
3. Auto-expires after 10 minutes

**Custom Subdomain** (1 minute - 7 days):
1. Click **"Custom"** button
2. Enter subdomain name and expiry time
3. Click **"Create"**

### Testing Callbacks

Send requests to your subdomain:

```bash
# DNS Query
dig test.yourdomain.com @8.8.8.8

# HTTP Request
curl http://test.yourdomain.com/path

# HTTPS with POST
curl -X POST https://test.yourdomain.com/api \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

All interactions appear in real-time on the dashboard with:
- **DNS**: Query type, source IP, geolocation
- **HTTP**: Method, path, headers, query params, body, geolocation

### Generating Scripts

1. Select a subdomain
2. Click **"Script Generator"**
3. Choose template type and file format
4. Click **"Generate"**
5. Copy HTTP or HTTPS URL
6. Access at: `http://subdomain.domain.com/script/filename.ext`

Scripts auto-delete after 5 minutes.

---

## Architecture

### Tech Stack

**Backend**
- Node.js 18+ with Express.js
- MongoDB 6.0+ (database)
- Socket.IO (real-time updates)
- dns2 (authoritative DNS server)
- geoip-lite (IP geolocation - offline)
- JWT (authentication)
- bcrypt (password hashing)

**Frontend**
- React 18 with Vite
- Tailwind CSS (styling)
- Socket.IO Client (real-time)
- Axios (HTTP client)
- React Hot Toast (notifications)
- React Syntax Highlighter (code display)

**Infrastructure**
- Nginx (reverse proxy)
- Let's Encrypt (SSL/TLS)
- UFW (firewall)
- PM2 (process manager)

### Project Structure

```
AlewoCallback/
├── server/                 # Backend (Node.js)
│   ├── index.js           # Entry point
│   ├── models/            # Database models
│   ├── controllers/       # Business logic
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, callback handler
│   ├── services/          # DNS server, cleanup
│   ├── templates/         # Script templates
│   └── utils/             # Helpers, geolocation
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Login, Dashboard
│   │   ├── contexts/      # Auth context
│   │   ├── services/      # API, Socket.IO
│   │   └── utils/         # Content-type detection
│   └── dist/              # Built files
├── docs/                  # Documentation
│   ├── NS-RECORDS-SETUP-GUIDE.md
│   └── DNS-TESTING-GUIDE.md
├── alewo-callback         # CLI management script
├── install.sh             # Interactive installer
└── README.md              # This file
```

---

## Security Features

- **Authentication**: JWT-based with 30-day tokens, registration disabled (admin-only)
- **Network Security**: Firewall (UFW), rate limiting, input validation, SSL/HTTPS
- **Data Security**: Auto-expiring resources, cascading deletion, offline geolocation (no external API calls)
- **Privacy**: Self-hosted, no third-party logging, complete data control

---

## Use Cases

AlewoCallback is designed for:
- **Penetration Testing**: Detect blind SSRF, XXE, SQL injection, RCE
- **Bug Bounty Hunting**: Identify out-of-band vulnerabilities
- **Security Research**: Analyze callback behaviors and exploit chains
- **Red Team Operations**: Test detection and monitoring capabilities
- **CTF Competitions**: Practice exploitation techniques

**Always obtain proper authorization before security testing.**

---

## Documentation

- **[Installation Guide](INSTALL.md)** - Complete installation instructions
- **[NS Records Setup](docs/NS-RECORDS-SETUP-GUIDE.md)** - NS delegation (mandatory for DNS logging)
- **[DNS Testing Guide](docs/DNS-TESTING-GUIDE.md)** - DNS verification and troubleshooting
- **[Additional Documentation](docs/)** - Guides and tutorials

---

## API Endpoints

### Authentication
```
POST   /api/auth/login      # Login
GET    /api/auth/me         # Get current user
```

### Subdomains
```
GET    /api/subdomains           # List all subdomains
POST   /api/subdomains/random    # Create random subdomain
POST   /api/subdomains/custom    # Create custom subdomain
DELETE /api/subdomains/:id       # Delete subdomain
PATCH  /api/subdomains/:id/toggle # Toggle active status
```

### Interactions (DNS + HTTP)
```
GET    /api/interactions                     # Get all interactions
GET    /api/interactions/subdomain/:id       # Get by subdomain
GET    /api/interactions/subdomain/:id/export # Export (JSON/CSV)
DELETE /api/interactions/subdomain/:id/clear # Clear all
```

### Scripts
```
GET    /api/scripts/templates           # Get available templates
GET    /api/scripts/subdomain/:id       # Get scripts for subdomain
POST   /api/scripts/generate            # Generate from template
POST   /api/scripts/custom              # Create custom script
DELETE /api/scripts/:id                 # Delete script
```

---

## Troubleshooting

### Services won't start
```bash
# Check logs
alewo-callback logs --error

# Verify ports not in use
sudo netstat -tuln | grep -E ':(53|80|443|3000)'

# Restart services
sudo alewo-callback restart
```

### DNS queries not captured
```bash
# Ensure DNS server is running
alewo-callback status

# Check port 53 is open
sudo ufw status | grep 53

# Test DNS server
dig test.yourdomain.com @YOUR_SERVER_IP

# Verify NS delegation
dig NS yourdomain.com @8.8.8.8
```

### SSL certificate issues
```bash
# Check SSL configuration
sudo nginx -t

# Renew certificates
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License

Copyright (c) 2025 Alewo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/AlewoCallback/issues)
- **Documentation**: [INSTALL.md](INSTALL.md) | [docs/](docs/)

---

<div align="center">

**AlewoCallback** - Built with ❤️ for security researchers and penetration testers

**© 2025 Alewo. All rights reserved.**

</div>
