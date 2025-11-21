#!/bin/bash

#######################################
# AlewoCallback - Interactive Installer
# Complete setup from start to finish
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}\n"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "Cannot detect OS. This installer supports Ubuntu/Debian only."
        exit 1
    fi

    log_info "Detected OS: $OS $VER"
}

# Get public IP
get_public_ip() {
    PUBLIC_IP=$(curl -s https://api.ipify.org || echo "127.0.0.1")
    echo "$PUBLIC_IP"
}

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║        █████╗ ██╗     ███████╗██╗    ██╗ ██████╗         ║"
    echo "║       ██╔══██╗██║     ██╔════╝██║    ██║██╔═══██╗        ║"
    echo "║       ███████║██║     █████╗  ██║ █╗ ██║██║   ██║        ║"
    echo "║       ██╔══██║██║     ██╔══╝  ██║███╗██║██║   ██║        ║"
    echo "║       ██║  ██║███████╗███████╗╚███╔███╔╝╚██████╔╝        ║"
    echo "║       ╚═╝  ╚═╝╚══════╝╚══════╝ ╚══╝╚══╝  ╚═════╝         ║"
    echo "║                                                           ║"
    echo "║              CALLBACK SERVICE INSTALLER                  ║"
    echo "║                   Version 1.0.0                          ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Prompt function
prompt() {
    local prompt_text=$1
    local default_value=$2
    local var_name=$3

    if [ -n "$default_value" ]; then
        read -p "$(echo -e ${CYAN}$prompt_text ${YELLOW}[$default_value]${NC}: )" input
        eval $var_name="${input:-$default_value}"
    else
        read -p "$(echo -e ${CYAN}$prompt_text${NC}: )" input
        eval $var_name="$input"
    fi
}

# Prompt password
prompt_password() {
    local prompt_text=$1
    local var_name=$2

    while true; do
        read -s -p "$(echo -e ${CYAN}$prompt_text${NC}: )" password
        echo ""
        read -s -p "$(echo -e ${CYAN}Confirm password${NC}: )" password2
        echo ""

        if [ "$password" = "$password2" ]; then
            if [ ${#password} -ge 6 ]; then
                eval $var_name="$password"
                break
            else
                log_error "Password must be at least 6 characters"
            fi
        else
            log_error "Passwords do not match"
        fi
    done
}

# Confirm action
confirm() {
    local prompt_text=$1
    read -p "$(echo -e ${YELLOW}$prompt_text ${NC}[y/N]: )" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Check system requirements
check_requirements() {
    log_step "Checking System Requirements"

    # Check CPU cores
    CPU_CORES=$(nproc)
    log_info "CPU Cores: $CPU_CORES"

    if [ $CPU_CORES -lt 1 ]; then
        log_warning "Recommended: 2+ CPU cores"
    fi

    # Check RAM
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    log_info "Total RAM: ${TOTAL_RAM}MB"

    if [ $TOTAL_RAM -lt 1024 ]; then
        log_warning "Recommended: 2GB+ RAM"
    fi

    # Check disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    log_info "Available Disk Space: ${DISK_SPACE}GB"

    if [ $DISK_SPACE -lt 10 ]; then
        log_warning "Recommended: 10GB+ free disk space"
    fi

    log_success "System check completed"
}

# Install Node.js
install_nodejs() {
    log_step "Installing Node.js 18.x"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js already installed: $NODE_VERSION"
        if confirm "Do you want to reinstall Node.js?"; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        fi
    else
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        log_success "Node.js installed: $(node --version)"
    fi
}

# Install MongoDB
install_mongodb() {
    log_step "Installing MongoDB"

    if command -v mongod &> /dev/null; then
        log_info "MongoDB already installed"
        if confirm "Do you want to reinstall MongoDB?"; then
            install_mongodb_package
        fi
    else
        install_mongodb_package
    fi

    # Start MongoDB
    systemctl start mongod
    systemctl enable mongod

    log_success "MongoDB installed and started"
}

install_mongodb_package() {
    if [ "$OS" = "ubuntu" ]; then
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        apt-get update
        apt-get install -y mongodb-org
    elif [ "$OS" = "debian" ]; then
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        apt-get update
        apt-get install -y mongodb-org
    fi
}

# Install Nginx
install_nginx() {
    log_step "Installing Nginx"

    if command -v nginx &> /dev/null; then
        log_info "Nginx already installed"
    else
        apt-get install -y nginx
        systemctl start nginx
        systemctl enable nginx
        log_success "Nginx installed and started"
    fi
}

# Install Certbot
install_certbot() {
    log_step "Installing Certbot (for SSL)"

    if command -v certbot &> /dev/null; then
        log_info "Certbot already installed"
    else
        apt-get install -y certbot python3-certbot-nginx
        log_success "Certbot installed"
    fi
}

# Install PM2
install_pm2() {
    log_step "Installing PM2"

    if command -v pm2 &> /dev/null; then
        log_info "PM2 already installed"
    else
        npm install -g pm2
        log_success "PM2 installed"
    fi
}

# Collect configuration
collect_configuration() {
    log_step "Configuration Setup"

    PUBLIC_IP=$(get_public_ip)

    echo -e "${CYAN}Please provide the following information:${NC}\n"

    # Domain configuration
    prompt "Enter your domain (leave empty for localhost/IP)" "" DOMAIN

    if [ -z "$DOMAIN" ]; then
        DOMAIN="$PUBLIC_IP"
        USE_SSL=false
        log_info "Using IP address: $DOMAIN"
    else
        log_info "Using domain: $DOMAIN"
        if confirm "Do you want to setup SSL certificate (HTTPS)?"; then
            USE_SSL=true
        else
            USE_SSL=false
        fi
    fi

    # Port configuration
    prompt "Enter application port" "3000" APP_PORT

    # Database configuration
    prompt "MongoDB URI" "mongodb://localhost:27017/alewo-callback" MONGODB_URI

    # Admin account
    echo ""
    log_info "Create administrator account"
    prompt "Admin username" "admin" ADMIN_USERNAME
    prompt "Admin email" "admin@${DOMAIN}" ADMIN_EMAIL
    prompt_password "Admin password (min 6 characters)" ADMIN_PASSWORD

    # JWT Secret
    JWT_SECRET=$(openssl rand -base64 32)
    log_info "Generated JWT secret"

    # File cleanup time
    prompt "Script expiration time (minutes)" "5" FILE_CLEANUP_TIME

    # Confirmation
    echo ""
    log_step "Configuration Summary"
    echo -e "${CYAN}Domain:${NC} $DOMAIN"
    echo -e "${CYAN}SSL:${NC} $USE_SSL"
    echo -e "${CYAN}Port:${NC} $APP_PORT"
    echo -e "${CYAN}MongoDB:${NC} $MONGODB_URI"
    echo -e "${CYAN}Admin Username:${NC} $ADMIN_USERNAME"
    echo -e "${CYAN}Admin Email:${NC} $ADMIN_EMAIL"
    echo -e "${CYAN}Script Expiration:${NC} $FILE_CLEANUP_TIME minutes"
    echo ""

    if ! confirm "Proceed with installation?"; then
        log_error "Installation cancelled"
        exit 1
    fi
}

# Setup application
setup_application() {
    log_step "Setting Up Application"

    INSTALL_DIR="/var/www/alewo-callback"

    # Create directory if not exists
    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR"
        log_info "Created directory: $INSTALL_DIR"
    fi

    # Copy files
    log_info "Copying application files..."
    cp -r ./* "$INSTALL_DIR/"
    cd "$INSTALL_DIR"

    # Create .env file
    log_info "Creating environment configuration..."
    cat > .env <<EOF
# Server Configuration
PORT=$APP_PORT
NODE_ENV=production

# Database
MONGODB_URI=$MONGODB_URI

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Domain Configuration
MAIN_DOMAIN=$DOMAIN
BASE_DOMAIN=$DOMAIN

# DNS Server Configuration
DNS_PORT=53
SERVER_IP=$(get_public_ip)

# SSL Configuration
SSL_ENABLED=$USE_SSL
SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/fullchain.pem

# File cleanup (in minutes)
FILE_CLEANUP_TIME=$FILE_CLEANUP_TIME
EOF

    # Create client .env
    cat > client/.env <<EOF
VITE_API_URL=https://$DOMAIN
VITE_BASE_DOMAIN=$DOMAIN
EOF

    log_success "Environment configuration created"
}

# Install dependencies
install_dependencies() {
    log_step "Installing Application Dependencies"

    cd "$INSTALL_DIR"

    log_info "Installing backend dependencies..."
    npm install --production

    log_info "Installing frontend dependencies..."
    cd client
    npm install

    log_info "Building frontend..."
    npm run build

    cd "$INSTALL_DIR"
    log_success "Dependencies installed and frontend built"
}

# Create admin user
create_admin_user() {
    log_step "Creating Administrator Account"

    cd "$INSTALL_DIR"

    # Create setup script
    cat > setup-admin.js <<'EOFSCRIPT'
import mongoose from 'mongoose';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminData = {
            username: process.env.ADMIN_USERNAME,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        };

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);
        console.log('Admin user created successfully!');
        console.log('Username:', admin.username);
        console.log('Email:', admin.email);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
EOFSCRIPT

    # Set admin credentials as env vars temporarily
    export ADMIN_USERNAME="$ADMIN_USERNAME"
    export ADMIN_EMAIL="$ADMIN_EMAIL"
    export ADMIN_PASSWORD="$ADMIN_PASSWORD"

    # Run setup script
    node setup-admin.js

    # Remove setup script
    rm setup-admin.js

    log_success "Administrator account created"
}

# Setup SSL
setup_ssl() {
    if [ "$USE_SSL" = true ]; then
        log_step "Setting Up SSL Certificate"

        if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_warning "Cannot setup SSL for IP address. Using self-signed certificate..."
            setup_self_signed_ssl
        else
            if confirm "Setup Let's Encrypt SSL certificate? (Requires DNS configured)"; then
                setup_letsencrypt_ssl
            else
                log_info "Setting up self-signed certificate..."
                setup_self_signed_ssl
            fi
        fi
    else
        log_info "Skipping SSL setup"
    fi
}

setup_letsencrypt_ssl() {
    log_info "Setting up Let's Encrypt certificate..."

    # Stop nginx temporarily
    systemctl stop nginx

    # Get certificate
    certbot certonly --standalone -d "$DOMAIN" -d "*.$DOMAIN" --preferred-challenges dns --email "$ADMIN_EMAIL" --agree-tos --non-interactive || {
        log_error "Failed to obtain SSL certificate"
        log_info "Falling back to self-signed certificate..."
        setup_self_signed_ssl
        return
    }

    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 0 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

    systemctl start nginx
    log_success "Let's Encrypt SSL certificate installed"
}

setup_self_signed_ssl() {
    log_info "Creating self-signed SSL certificate..."

    mkdir -p /etc/ssl/alewo-callback

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/alewo-callback/privkey.pem \
        -out /etc/ssl/alewo-callback/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=*.$DOMAIN"

    # Update .env
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/ssl/alewo-callback/privkey.pem|g" "$INSTALL_DIR/.env"
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/ssl/alewo-callback/fullchain.pem|g" "$INSTALL_DIR/.env"

    log_success "Self-signed SSL certificate created"
}

# Configure Nginx
configure_nginx() {
    log_step "Configuring Nginx"

    if [ "$USE_SSL" = true ]; then
        PROTOCOL="https"
        SSL_CONFIG="
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
"
        if [ -f "/etc/ssl/alewo-callback/fullchain.pem" ]; then
            SSL_CONFIG="
    ssl_certificate /etc/ssl/alewo-callback/fullchain.pem;
    ssl_certificate_key /etc/ssl/alewo-callback/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
"
        fi
    else
        PROTOCOL="http"
        SSL_CONFIG=""
    fi

    # Create Nginx configuration
    cat > /etc/nginx/sites-available/alewo-callback <<EOFNGINX
# Main domain
server {
    listen 80;
    server_name $DOMAIN;

$(if [ "$USE_SSL" = true ]; then echo "    listen 443 ssl http2;"; echo "$SSL_CONFIG"; fi)

$(if [ "$USE_SSL" = true ]; then echo "    # Redirect HTTP to HTTPS"; echo "    if (\$scheme != \"https\") {"; echo "        return 301 https://\$host\$request_uri;"; echo "    }"; fi)

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:$APP_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}

# Wildcard subdomains
server {
    listen 80;
    server_name *.$DOMAIN;

$(if [ "$USE_SSL" = true ]; then echo "    listen 443 ssl http2;"; echo "$SSL_CONFIG"; fi)

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOFNGINX

    # Enable site
    ln -sf /etc/nginx/sites-available/alewo-callback /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    nginx -t

    # Reload Nginx
    systemctl reload nginx

    log_success "Nginx configured and reloaded"
}

# Setup PM2
setup_pm2() {
    log_step "Setting Up PM2 Process Manager"

    cd "$INSTALL_DIR"

    # Stop existing process if any
    pm2 delete alewo-callback 2>/dev/null || true

    # Start application
    pm2 start server/index.js --name alewo-callback

    # Save PM2 configuration
    pm2 save

    # Setup PM2 startup
    pm2 startup | tail -n 1 | bash

    log_success "PM2 configured and application started"
}

# Setup firewall
setup_firewall() {
    log_step "Configuring Firewall"

    if command -v ufw &> /dev/null; then
        # Allow SSH
        ufw allow 22/tcp

        # Allow HTTP and HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp

        # Enable firewall
        echo "y" | ufw enable

        log_success "Firewall configured"
    else
        log_warning "UFW not installed, skipping firewall configuration"
    fi
}

# Create management scripts
create_management_scripts() {
    log_step "Creating Management Scripts"

    # Create start script
    cat > /usr/local/bin/alewo-start <<'EOFSTART'
#!/bin/bash
pm2 start alewo-callback
EOFSTART
    chmod +x /usr/local/bin/alewo-start

    # Create stop script
    cat > /usr/local/bin/alewo-stop <<'EOFSTOP'
#!/bin/bash
pm2 stop alewo-callback
EOFSTOP
    chmod +x /usr/local/bin/alewo-stop

    # Create restart script
    cat > /usr/local/bin/alewo-restart <<'EOFRESTART'
#!/bin/bash
pm2 restart alewo-callback
EOFRESTART
    chmod +x /usr/local/bin/alewo-restart

    # Create status script
    cat > /usr/local/bin/alewo-status <<'EOFSTATUS'
#!/bin/bash
pm2 status alewo-callback
EOFSTATUS
    chmod +x /usr/local/bin/alewo-status

    # Create logs script
    cat > /usr/local/bin/alewo-logs <<'EOFLOGS'
#!/bin/bash
pm2 logs alewo-callback
EOFLOGS
    chmod +x /usr/local/bin/alewo-logs

    log_success "Management scripts created"
}

# Test installation
test_installation() {
    log_step "Testing Installation"

    log_info "Waiting for application to start..."
    sleep 5

    # Test health endpoint
    if curl -f -s "${PROTOCOL}://${DOMAIN}/health" > /dev/null; then
        log_success "Application is responding correctly"
    else
        log_warning "Application health check failed, but this might be normal"
    fi

    # Check MongoDB
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB is running"
    else
        log_error "MongoDB is not running"
    fi

    # Check Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running"
    fi

    # Check PM2
    if pm2 list | grep -q "alewo-callback.*online"; then
        log_success "Application is running in PM2"
    else
        log_error "Application is not running in PM2"
    fi
}

# Show completion message
show_completion() {
    log_step "Installation Complete!"

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║           INSTALLATION COMPLETED SUCCESSFULLY!            ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}Access your AlewoCallback service at:${NC}"
    echo -e "${GREEN}${PROTOCOL}://${DOMAIN}${NC}"
    echo ""
    echo -e "${CYAN}Administrator Credentials:${NC}"
    echo -e "${YELLOW}Username:${NC} $ADMIN_USERNAME"
    echo -e "${YELLOW}Email:${NC} $ADMIN_EMAIL"
    echo -e "${YELLOW}Password:${NC} (the one you entered)"
    echo ""
    echo -e "${CYAN}Management Commands:${NC}"
    echo -e "  ${GREEN}alewo-start${NC}   - Start the application"
    echo -e "  ${GREEN}alewo-stop${NC}    - Stop the application"
    echo -e "  ${GREEN}alewo-restart${NC} - Restart the application"
    echo -e "  ${GREEN}alewo-status${NC}  - Check application status"
    echo -e "  ${GREEN}alewo-logs${NC}    - View application logs"
    echo ""
    echo -e "${CYAN}Important Files:${NC}"
    echo -e "  ${YELLOW}Installation Directory:${NC} $INSTALL_DIR"
    echo -e "  ${YELLOW}Environment Config:${NC} $INSTALL_DIR/.env"
    echo -e "  ${YELLOW}Nginx Config:${NC} /etc/nginx/sites-available/alewo-callback"
    echo ""

    if [ "$USE_SSL" = false ] && [ "$DOMAIN" != "$PUBLIC_IP" ]; then
        echo -e "${YELLOW}Note: To enable SSL later, run:${NC}"
        echo -e "  certbot --nginx -d $DOMAIN -d *.$DOMAIN"
        echo ""
    fi

    if [ "$DOMAIN" != "$PUBLIC_IP" ]; then
        echo -e "${YELLOW}DNS Configuration Required:${NC}"
        echo -e "  Add these DNS records at your DNS provider:"
        echo -e "  ${GREEN}A${NC}      $DOMAIN       -> $PUBLIC_IP"
        echo -e "  ${GREEN}A${NC}      *.$DOMAIN     -> $PUBLIC_IP"
        echo -e "  ${GREEN}NS${NC}     $DOMAIN       -> ns1.$DOMAIN"
        echo -e "  ${GREEN}A${NC}      ns1.$DOMAIN   -> $PUBLIC_IP"
        echo ""
        echo -e "  ${YELLOW}Note:${NC} DNS server is running on port 53 (UDP)"
        echo -e "  ${YELLOW}Note:${NC} Subdomain auto-delete after 10 minutes"
        echo ""
    fi

    echo -e "${CYAN}Security Recommendations:${NC}"
    echo -e "  1. Change the JWT secret in .env file"
    echo -e "  2. Setup regular database backups"
    echo -e "  3. Keep system packages updated"
    echo -e "  4. Monitor application logs regularly"
    echo ""
    echo -e "${GREEN}Happy testing! 🚀${NC}"
    echo ""
}

# Main installation flow
main() {
    show_banner

    # Check if running as root
    check_root

    # Detect OS
    detect_os

    # Check system requirements
    check_requirements

    # Collect configuration
    collect_configuration

    # Update system
    log_step "Updating System Packages"
    apt-get update
    apt-get upgrade -y

    # Install prerequisites
    apt-get install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https software-properties-common

    # Install Node.js
    install_nodejs

    # Install MongoDB
    install_mongodb

    # Install Nginx
    install_nginx

    # Install Certbot
    if [ "$USE_SSL" = true ]; then
        install_certbot
    fi

    # Install PM2
    install_pm2

    # Setup application
    setup_application

    # Install dependencies
    install_dependencies

    # Create admin user
    create_admin_user

    # Setup SSL
    setup_ssl

    # Configure Nginx
    configure_nginx

    # Setup PM2
    setup_pm2

    # Setup firewall
    setup_firewall

    # Create management scripts
    create_management_scripts

    # Test installation
    test_installation

    # Show completion message
    show_completion
}

# Run main installation
main
