# AlewoCallback

**Modern Out-of-Band (OOB) Callback Service** for detecting blind vulnerabilities (SSRF, XXE, SQL Injection) similar to Burp Collaborator. Monitor DNS queries and HTTP requests in real-time with IP geolocation tracking.

## ✨ Key Features

### Core Functionality
- **DNS Server (Port 53)**: Capture all DNS query types (A, AAAA, TXT, MX, CNAME, NS, SOA, PTR)
- **HTTP/HTTPS Monitoring**: Capture all methods (GET, POST, PUT, DELETE, etc.) with full request details
- **Combined Timeline**: Unified view of DNS + HTTP interactions
- **IP Geolocation**: Automatic location tracking (country, region, city, coordinates) for all requests
- **Real-time Updates**: Live notifications via Socket.IO

### Subdomain Management
- **Random Subdomains**: Auto-expire after 10 minutes (fixed)
- **Custom Subdomains**: User-defined expiry from 1 minute to 7 days
- **Auto-cleanup**: Cascading deletion of related data

### Script Generator
Generate testing payloads with multiple templates:
- **Shell**: bash, sh
- **Backdoors**: PHP, JSP, ASPX
- **Command scripts**: BAT, PowerShell, Python
- **Web payloads**: HTML, JavaScript, XML
- **SQL injection**: MSSQL, MySQL, Oracle

Scripts auto-delete after 5 minutes for security.

### Data Export & Analysis
- Export interactions as **JSON** or **CSV** (includes geolocation & DNS query types)
- Search and filter by type, IP, or custom criteria
- View detailed request information (headers, body, metadata)

### Security
- **JWT Authentication** (registration disabled - admin-only access)
- **SSL/HTTPS Support** via Let's Encrypt
- Rate limiting and input validation
- Secure password hashing with bcrypt

## 🚀 Quick Start

### Installation (One Command)

```bash
# Clone repository
git clone https://github.com/your-org/AlewoCallback.git
cd AlewoCallback

# Run interactive installer
sudo bash install.sh
```

The installer will:
- ✅ Install dependencies (Node.js, MongoDB, Nginx)
- ✅ Configure environment variables
- ✅ Create administrator account
- ✅ Setup SSL/HTTPS (optional with dynamic DNS provider detection)
- ✅ Configure DNS and firewall
- ✅ Install `alewo-callback` command globally

**Installation time:** 5-10 minutes

**See [INSTALL.md](INSTALL.md) for complete guide.**

## 📋 System Requirements

### Minimum
- **OS**: Ubuntu 20.04+ or Debian 11+
- **CPU**: 1 Core
- **RAM**: 1GB
- **Disk**: 10GB free space
- **Access**: Root/sudo

### Recommended
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2+ Cores
- **RAM**: 2GB+
- **Disk**: 20GB+ free space
- **Domain**: Custom domain with wildcard DNS (*.yourdomain.com)

## 🎮 Management Commands

After installation, use the unified `alewo-callback` command:

```bash
# Start all services (HTTP, DNS, MongoDB)
sudo alewo-callback start

# Stop all services
sudo alewo-callback stop

# Restart all services
sudo alewo-callback restart

# Check service status
alewo-callback status

# View logs
alewo-callback logs
alewo-callback logs -f                    # Follow logs in real-time
alewo-callback logs --error               # Show error log
alewo-callback logs -n 100                # Show last 100 lines

# Uninstall (with backup option)
sudo alewo-callback uninstall

# Show help
alewo-callback help
```

**Note:** `start`, `stop`, `restart`, and `uninstall` require sudo/root access.

## 🌐 Usage

### Access the Dashboard

After installation, access at:
- **With domain**: `https://yourdomain.com`
- **Without domain**: `http://YOUR_SERVER_IP`

Login with the admin credentials created during installation.

### Create Callback Subdomains

#### Random Subdomain (10 min expiry)
1. Click **"Random"** button
2. Subdomain created automatically (e.g., `abc123xyz.yourdomain.com`)
3. Auto-expires after 10 minutes

#### Custom Subdomain (1 min - 7 days)
1. Click **"Custom"** button
2. Enter subdomain name (e.g., `test`)
3. Set expiry time (1-10080 minutes)
4. Click **"Create"**

### Receive Callbacks

Send requests to your subdomain:

```bash
# DNS Query
nslookup test.yourdomain.com

# HTTP Request
curl https://test.yourdomain.com/path

# POST with data
curl -X POST https://test.yourdomain.com/api \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**All interactions appear in real-time!**

### Generate Scripts

1. Select a subdomain
2. Click **"Script Generator"**
3. Choose template type (shell, backdoor, cmd, web, sql)
4. Choose file format
5. Click **"Generate"**
6. **Copy HTTP or HTTPS URL** (choose your protocol)
7. Access script at: `http://subdomain.domain.com/script/filename.ext`

**Scripts auto-delete after 5 minutes.**

### View Interaction Details

Click any interaction to see:
- **DNS**: Query type (A, TXT, MX, etc.), source IP, geolocation
- **HTTP**: Method, path, headers, query params, body
- **Geolocation**: Country, region, city, coordinates

### Export Data

Click **"Export"** button:
- **JSON**: Full structured data
- **CSV**: Spreadsheet format (includes geolocation & query types)

## 🏗️ Tech Stack

### Backend
- **Node.js** + Express.js
- **MongoDB** (Database)
- **Socket.IO** (Real-time)
- **dns2** (DNS Server)
- **geoip-lite** (IP Geolocation - offline database)
- **JWT** (Authentication)
- **bcrypt** (Password hashing)

### Frontend
- **React 18** + Vite
- **Tailwind CSS** (Styling)
- **Socket.IO Client** (Real-time updates)
- **Axios** (HTTP client)
- **React Hot Toast** (Notifications)
- **React Syntax Highlighter** (Code display)

### Infrastructure
- **Nginx** (Reverse proxy)
- **Let's Encrypt** (SSL certificates)
- **UFW** (Firewall)

## 📁 Project Structure

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
│   │   └── services/      # API, Socket.IO
│   └── dist/              # Built files
├── alewo-callback         # CLI manager script
├── install.sh             # Interactive installer
├── .env.example           # Server environment template
├── client/.env.example    # Client environment template
└── README.md              # This file
```

## 🔐 Security Features

### Authentication
- JWT-based authentication with 30-day tokens
- Registration **disabled** (admin-only access)
- Accounts created during installation only
- Secure password hashing with bcrypt

### Network Security
- Firewall configuration (UFW)
- Rate limiting on API endpoints
- Input validation and sanitization
- HTTPS/SSL support via Let's Encrypt

### Data Security
- Auto-expiring resources (subdomains, scripts)
- Cascading deletion of related data
- No sensitive data in logs
- IP geolocation without external API calls (offline)

## 🛠️ Development

### Local Development Setup

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Setup environment
cp .env.example .env
cp client/.env.example client/.env
# Edit .env files with your settings

# Start MongoDB (if not running)
sudo systemctl start mongod

# Start development servers
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Manual Admin Account Creation

```bash
# Connect to MongoDB
mongosh

# Use database
use alewo-callback

# Create admin user
db.users.insertOne({
  username: "admin",
  email: "admin@example.com",
  password: "$2a$10$hashedpassword",  // Hash with bcrypt
  createdAt: new Date()
})
```

## 📖 API Endpoints

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

### Callbacks (HTTP)
```
GET    /api/callbacks                     # Get all callbacks
GET    /api/callbacks/subdomain/:id       # Get by subdomain
DELETE /api/callbacks/:id                 # Delete callback
DELETE /api/callbacks/subdomain/:id/clear # Clear all for subdomain
```

### Interactions (Combined DNS + HTTP)
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

## 🎯 Use Cases

This tool is designed for:
- **Penetration Testing**: Detect blind SSRF, XXE, SQL injection
- **Bug Bounty Hunting**: Identify OOB vulnerabilities
- **Security Research**: Analyze callback behaviors
- **Red Team Operations**: Test detection capabilities
- **CTF Competitions**: Practice exploitation techniques

**Always obtain proper authorization before testing.**

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
alewo-callback logs --error

# Verify ports are not in use
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
nslookup test.yourdomain.com YOUR_SERVER_IP
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

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/AlewoCallback/issues)
- **Documentation**: [INSTALL.md](INSTALL.md)

---

**Built with ❤️ for security researchers and penetration testers**
