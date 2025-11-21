# AlewoCallback

A modern, colorful callback service similar to Burp Collaborator. Monitor HTTP/HTTPS requests in real-time, generate testing scripts, and analyze callbacks with a beautiful interface.

## Features

- **DNS + HTTP Monitoring**: Full DNS server integration for out-of-band detection
- **Real-time Interactions**: Live DNS queries and HTTP requests with Socket.IO
- **Combined Timeline View**: See all DNS and HTTP interactions in one unified timeline
- **IP Geolocation**: Automatic geolocation detection for all DNS and HTTP requests (country, region, city, coordinates)
- **Auto-Expiring Subdomains**: Random subdomains expire after 10 minutes, custom subdomains support user-defined expiry (1 minute to 7 days)
- **Modern UI**: Beautiful, colorful design with animated gradients and glass-morphism effects
- **Random & Custom Subdomains**: Generate random subdomains (10 min expiry) or create custom subdomains with configurable expiry time (up to 7 days)
- **All HTTP Methods**: Support for GET, POST, PUT, DELETE, PATCH, and more
- **SSL/HTTPS Support**: Secure callback handling with Let's Encrypt integration
- **Comprehensive Request Viewer**: View headers, query parameters, body, and metadata
- **Export Capabilities**: Export interactions as JSON or CSV for analysis
- **Search & Filter**: Powerful filtering by type (DNS/HTTP), search, and date range
- **Script Generator**: Generate testing scripts with multiple templates:
  - Shell scripts (bash, sh)
  - Backdoors (PHP, JSP, ASPX)
  - Command scripts (BAT, PowerShell, Python)
  - Web payloads (HTML, JavaScript, XML)
  - SQL injection callbacks (MSSQL, MySQL, Oracle)
- **Auto-Expiring Scripts**: Scripts automatically delete after 5 minutes for security
- **Custom Scripts**: Upload custom scripts with any file format
- **Authentication**: Secure JWT-based authentication (registration disabled by default)
- **Dashboard**: Intuitive interface to manage everything

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB (Database)
- Socket.IO (Real-time communication)
- JWT (Authentication)
- Helmet (Security)

### Frontend
- React 18
- Vite (Build tool)
- Tailwind CSS (Styling)
- Lucide React (Icons)
- React Router (Navigation)
- Axios (HTTP client)
- Socket.IO Client (Real-time)
- React Hot Toast (Notifications)
- React Syntax Highlighter (Code display)

## Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+
- Domain with wildcard DNS support (e.g., `*.callback.yourdomain.com`)

## Quick Start

### Automated Installation (Recommended)

**One-command installation** that sets up everything automatically:

```bash
# Clone repository
git clone <repository-url>
cd AlewoCallback

# Run interactive installer
sudo bash install.sh
```

The installer will:
- ✅ Install all dependencies (Node.js, MongoDB, Nginx, PM2)
- ✅ Configure environment variables
- ✅ Create administrator account
- ✅ Setup SSL/HTTPS (optional)
- ✅ Configure DNS and firewall
- ✅ Start the application

**See [INSTALL.md](INSTALL.md) for complete installation guide.**

### Manual Installation (Development)

For development or manual setup:

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd AlewoCallback
npm run install-all

# 2. Configure environment
cp .env.example .env
cp client/.env.example client/.env
# Edit .env and client/.env with your settings

# 3. Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

**Note:** Registration is disabled. Create admin account during installation or manually via MongoDB.

## Usage

### Create Subdomains

- **Random**: Click "Random" to generate a random subdomain
- **Custom**: Click "Custom" to create your own subdomain name

### Receive Callbacks

Send requests to your subdomain:

```bash
curl https://yoursubdomain.callback.local/test
```

Callbacks appear in real-time!

### Generate Scripts

1. Select a subdomain
2. Choose template (shell, backdoor, cmd, web, sql)
3. Choose file format
4. Click "Generate"
5. Copy URL or download script

Scripts expire after 5 minutes.

### View Callback Details

Click any callback to see:
- Request method, path, IP, user agent
- All headers and query parameters
- Request body (formatted JSON or raw)

## API Documentation

See full API documentation in [README.md](README.md#api-endpoints)

## Deployment

### Using PM2

```bash
npm run build
pm2 start server/index.js --name alewo-callback
pm2 save
```

### Using Docker

```bash
docker-compose up -d
```

For production deployment guide, see [SETUP_GUIDE.md](SETUP_GUIDE.md#production-deployment)

## Security

This tool is designed for:
- Authorized penetration testing
- Security research
- Educational purposes
- Bug bounty hunting

Always obtain proper authorization before testing.

## License

MIT License

## Support

Open an issue on GitHub for questions or bug reports.

---

Built with ❤️ for security researchers and penetration testers