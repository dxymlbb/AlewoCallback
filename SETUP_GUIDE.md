# AlewoCallback - Complete Setup Guide

## Quick Start (Local Development)

### 1. Install Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version
npm --version

# Check MongoDB
mongod --version
```

If not installed:

**Node.js:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**MongoDB:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y mongodb-org

# macOS
brew tap mongodb/brew
brew install mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd AlewoCallback

# Install all dependencies
npm run install-all
```

### 3. Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp client/.env.example client/.env
```

**Edit `.env`:**
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/alewo-callback
JWT_SECRET=$(openssl rand -base64 32)  # Generate random secret
MAIN_DOMAIN=localhost
BASE_DOMAIN=callback.local
SSL_ENABLED=false
FILE_CLEANUP_TIME=5
```

**Edit `client/.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_BASE_DOMAIN=callback.local
```

### 4. Configure Local DNS

**Linux/macOS:**
```bash
sudo nano /etc/hosts
```

**Windows:**
```
notepad C:\Windows\System32\drivers\etc\hosts
```

Add these lines:
```
127.0.0.1 callback.local
127.0.0.1 test.callback.local
```

### 5. Start Development Server

```bash
# Terminal 1: Start MongoDB (if not using Docker)
mongod

# Terminal 2: Start the application
npm run dev
```

Open browser: http://localhost:5173

### 6. Create First Account

1. Click "Sign Up"
2. Create account (username, email, password)
3. You're in! Start creating subdomains

## Production Deployment

### Option 1: VPS Deployment (Ubuntu/Debian)

#### 1. Server Setup

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

#### 2. Clone and Build

```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> alewo-callback
cd alewo-callback

# Set permissions
sudo chown -R $USER:$USER /var/www/alewo-callback

# Install dependencies
npm run install-all

# Build frontend
cd client
npm run build
cd ..
```

#### 3. Configure Environment

```bash
# Create production .env
sudo nano .env
```

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/alewo-callback
JWT_SECRET=YOUR_VERY_SECRET_KEY_HERE_CHANGE_THIS
MAIN_DOMAIN=callback.yourdomain.com
BASE_DOMAIN=callback.yourdomain.com
SSL_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/callback.yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/callback.yourdomain.com/fullchain.pem
FILE_CLEANUP_TIME=5
```

#### 4. DNS Configuration

In your domain registrar (Cloudflare, Namecheap, etc.):

```
Type: A
Name: callback
Value: YOUR_SERVER_IP

Type: A
Name: *.callback
Value: YOUR_SERVER_IP
```

**Important:** If using Cloudflare, disable proxy (DNS only) for wildcard to work properly.

#### 5. SSL Certificate

```bash
# Get wildcard SSL certificate
sudo certbot certonly --manual --preferred-challenges dns \
  -d callback.yourdomain.com \
  -d "*.callback.yourdomain.com"

# Follow instructions to add TXT records
# TXT Record: _acme-challenge.callback.yourdomain.com
# Value: <provided by certbot>
```

#### 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/alewo-callback
```

```nginx
# Main domain
server {
    listen 80;
    listen 443 ssl http2;
    server_name callback.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/callback.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/callback.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Wildcard subdomains
server {
    listen 80;
    listen 443 ssl http2;
    server_name *.callback.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/callback.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/callback.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/alewo-callback /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. PM2 Setup

```bash
# Install PM2
sudo npm install -g pm2

# Start application
cd /var/www/alewo-callback
pm2 start server/index.js --name alewo-callback

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it provides

# Monitor
pm2 monit
```

#### 8. Firewall Setup

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

Already included in the project.

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    restart: always
    volumes:
      - mongodb_data:/data/db
    networks:
      - alewo-network

  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/alewo-callback
      - JWT_SECRET=${JWT_SECRET}
      - BASE_DOMAIN=${BASE_DOMAIN}
      - SSL_ENABLED=${SSL_ENABLED}
    depends_on:
      - mongodb
    networks:
      - alewo-network
    volumes:
      - ./ssl:/app/ssl:ro

networks:
  alewo-network:
    driver: bridge

volumes:
  mongodb_data:
```

#### 3. Create .env file

```env
JWT_SECRET=your-secret-key-here
BASE_DOMAIN=callback.yourdomain.com
SSL_ENABLED=true
```

#### 4. Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create alewo-callback

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set BASE_DOMAIN=your-app.herokuapp.com
heroku config:set SSL_ENABLED=true

# Deploy
git push heroku main

# Open
heroku open
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Select Node.js
3. Set build command: `npm run build`
4. Set run command: `node server/index.js`
5. Add MongoDB database
6. Set environment variables
7. Deploy

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js alewo-callback

# Create environment
eb create alewo-callback-env

# Set environment variables
eb setenv NODE_ENV=production JWT_SECRET=your-secret

# Deploy
eb deploy

# Open
eb open
```

## Testing the Deployment

### 1. Basic Test

```bash
# Test main domain
curl https://callback.yourdomain.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Create Test Subdomain

1. Register account on website
2. Create a subdomain (e.g., "test")
3. Test callback:

```bash
curl https://test.callback.yourdomain.com/test-endpoint
```

You should see the callback appear in the dashboard!

### 3. Test Script Generation

1. Select subdomain
2. Generate a script (e.g., PHP backdoor)
3. Access the script URL
4. Verify it's accessible

### 4. Test SSL

```bash
# Should show valid certificate
openssl s_client -connect callback.yourdomain.com:443 -servername callback.yourdomain.com

# Test wildcard
openssl s_client -connect test.callback.yourdomain.com:443 -servername test.callback.yourdomain.com
```

## Maintenance

### Backup MongoDB

```bash
# Create backup
mongodump --db alewo-callback --out /backup/$(date +%Y%m%d)

# Restore backup
mongorestore --db alewo-callback /backup/20231201/alewo-callback
```

### Update Application

```bash
# Pull latest changes
cd /var/www/alewo-callback
git pull

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Restart
pm2 restart alewo-callback
```

### Renew SSL Certificate

```bash
# Test renewal
sudo certbot renew --dry-run

# Actual renewal (auto-runs via cron)
sudo certbot renew
sudo systemctl reload nginx
```

### View Logs

```bash
# PM2 logs
pm2 logs alewo-callback

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

## Troubleshooting

### Subdomain Not Working

1. Check DNS propagation: `nslookup test.callback.yourdomain.com`
2. Check Nginx config: `sudo nginx -t`
3. Check server logs: `pm2 logs`

### SSL Certificate Issues

1. Verify certificate: `sudo certbot certificates`
2. Check file permissions: `sudo ls -l /etc/letsencrypt/live/`
3. Renew if needed: `sudo certbot renew --force-renewal`

### MongoDB Connection Failed

1. Check if running: `sudo systemctl status mongod`
2. Check connection: `mongo --eval "db.adminCommand('ping')"`
3. Check URI in `.env`

### High Memory Usage

```bash
# Check PM2 processes
pm2 list

# Restart if needed
pm2 restart alewo-callback

# Set memory limit
pm2 start server/index.js --name alewo-callback --max-memory-restart 500M
```

## Performance Optimization

### 1. Enable Compression

Add to Nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
```

### 2. MongoDB Indexing

Already included in models, but verify:
```javascript
db.callbacks.getIndexes()
db.subdomains.getIndexes()
```

### 3. PM2 Cluster Mode

```bash
pm2 start server/index.js -i max --name alewo-callback
```

## Security Checklist

- [ ] Changed JWT_SECRET from default
- [ ] Enabled SSL/HTTPS
- [ ] Configured firewall (UFW/iptables)
- [ ] Set up fail2ban for SSH
- [ ] Regular security updates
- [ ] MongoDB authentication enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Regular backups scheduled

---

Need help? Open an issue on GitHub!
