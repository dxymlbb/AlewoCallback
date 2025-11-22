#!/bin/bash

#######################################
# AlewoCallback - Interactive Installer
# Complete setup from start to finish
#######################################

# Don't exit on error - we handle errors manually
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# State file for resume capability
STATE_FILE="/tmp/alewo-callback-install-state"

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

# State management functions
mark_step_complete() {
    local step_name=$1
    echo "$step_name" >> "$STATE_FILE"
    log_success "Step completed: $step_name"
}

is_step_complete() {
    local step_name=$1
    if [ -f "$STATE_FILE" ] && grep -q "^$step_name$" "$STATE_FILE"; then
        return 0
    else
        return 1
    fi
}

skip_if_complete() {
    local step_name=$1
    local step_description=$2

    if is_step_complete "$step_name"; then
        log_info "Skipping $step_description (already completed)"
        return 0
    else
        return 1
    fi
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

# Show installation state
show_state() {
    if [ -f "$STATE_FILE" ]; then
        echo -e "${CYAN}Completed steps:${NC}"
        while IFS= read -r step; do
            echo -e "  ${GREEN}✓${NC} $step"
        done < "$STATE_FILE"
        echo ""
    fi
}

# Reset installation state
reset_state() {
    if [ -f "$STATE_FILE" ]; then
        rm -f "$STATE_FILE"
        log_success "Installation state reset"
    fi
}

# Clear state on successful completion
clear_state() {
    if [ -f "$STATE_FILE" ]; then
        rm -f "$STATE_FILE"
        log_success "Installation completed - state cleared"
    fi
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

    # Show resume information if state file exists
    if [ -f "$STATE_FILE" ]; then
        log_warning "Resuming previous installation"
        show_state
        if confirm "Do you want to reset and start fresh?"; then
            reset_state
        else
            log_info "Continuing from last checkpoint..."
        fi
        echo ""
    fi
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
    skip_if_complete "nodejs" "Node.js installation" && return 0

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

    mark_step_complete "nodejs"
}

# Install MongoDB
install_mongodb() {
    skip_if_complete "mongodb" "MongoDB installation" && return 0

    log_step "Installing MongoDB"

    if command -v mongod &> /dev/null; then
        log_info "MongoDB already installed"
        if confirm "Do you want to reinstall MongoDB?"; then
            install_mongodb_package || {
                log_error "MongoDB installation failed"
                return 1
            }
        fi
    else
        install_mongodb_package || {
            log_error "MongoDB installation failed"
            log_info "You can retry installation by running this script again"
            return 1
        }
    fi

    # Start MongoDB
    systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null
    systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null

    log_success "MongoDB installed and started"
    mark_step_complete "mongodb"
}

install_mongodb_package() {
    # Clean up any existing MongoDB repository files first
    log_info "Cleaning up old MongoDB repository files..."
    rm -f /etc/apt/sources.list.d/mongodb*.list

    if [ "$OS" = "ubuntu" ]; then
        local UBUNTU_CODENAME=$(lsb_release -cs)

        # Ubuntu Noble (24.04) - use MongoDB 8.0 with Jammy repo
        if [ "$UBUNTU_CODENAME" = "noble" ]; then
            log_warning "Ubuntu 24.04 (Noble) detected"
            log_info "Installing MongoDB 8.0 (compatible version for Noble)..."

            # Add MongoDB 8.0 GPG key
            curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
                gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

            # Add MongoDB 8.0 repository using Jammy (compatible with Noble)
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
                tee /etc/apt/sources.list.d/mongodb-org-8.0.list

            apt-get update
            apt-get install -y mongodb-org

        else
            # For older Ubuntu versions, use official MongoDB 6.0 repo
            log_info "Setting up MongoDB 6.0 repository..."

            # Use signed-by method instead of deprecated apt-key
            curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
                gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $UBUNTU_CODENAME/mongodb-org/6.0 multiverse" | \
                tee /etc/apt/sources.list.d/mongodb-org-6.0.list

            apt-get update
            apt-get install -y mongodb-org
        fi

    elif [ "$OS" = "debian" ]; then
        log_info "Setting up MongoDB for Debian..."

        # Use signed-by method for Debian too
        curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
            gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/6.0 main" | \
            tee /etc/apt/sources.list.d/mongodb-org-6.0.list

        apt-get update
        apt-get install -y mongodb-org
    fi

    if [ $? -ne 0 ]; then
        log_error "MongoDB installation failed"
        return 1
    fi

    return 0
}

# Install Nginx
install_nginx() {
    skip_if_complete "nginx" "Nginx installation" && return 0

    log_step "Installing Nginx"

    if command -v nginx &> /dev/null; then
        log_info "Nginx already installed"
    else
        apt-get install -y nginx || {
            log_error "Nginx installation failed"
            return 1
        }
        systemctl start nginx
        systemctl enable nginx
        log_success "Nginx installed and started"
    fi

    mark_step_complete "nginx"
}

# Install Certbot
install_certbot() {
    skip_if_complete "certbot" "Certbot installation" && return 0

    log_step "Installing Certbot (for SSL)"

    if command -v certbot &> /dev/null; then
        log_info "Certbot already installed"
    else
        apt-get install -y certbot python3-certbot-nginx || {
            log_error "Certbot installation failed"
            return 1
        }
        log_success "Certbot installed"
    fi

    mark_step_complete "certbot"
}

# Install PM2
install_pm2() {
    skip_if_complete "pm2" "PM2 installation" && return 0

    log_step "Installing PM2"

    # Get Node.js installation path
    local NODE_DIR=$(dirname $(dirname $(which node 2>/dev/null || echo "/opt/node22/bin/node")))
    local NPM_BIN="$NODE_DIR/bin/npm"
    local PM2_BIN="$NODE_DIR/bin/pm2"

    if [ -f "$PM2_BIN" ]; then
        log_info "PM2 already installed at $PM2_BIN"
    else
        log_info "Installing PM2 using $NPM_BIN..."
        "$NPM_BIN" install -g pm2 || {
            log_error "PM2 installation failed"
            return 1
        }
        log_success "PM2 installed at $PM2_BIN"
    fi

    # Add PM2 to PATH in /etc/environment if not already there
    if ! grep -q "$NODE_DIR/bin" /etc/environment 2>/dev/null; then
        log_info "Adding Node.js/PM2 to system PATH..."
        # Backup /etc/environment
        cp /etc/environment /etc/environment.bak 2>/dev/null || true

        # Add to PATH
        if grep -q "^PATH=" /etc/environment 2>/dev/null; then
            sed -i "s|^PATH=\"\\(.*\\)\"|PATH=\"$NODE_DIR/bin:\\1\"|" /etc/environment
        else
            echo "PATH=\"$NODE_DIR/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"" >> /etc/environment
        fi

        # Export for current session
        export PATH="$NODE_DIR/bin:$PATH"
        log_success "Node.js/PM2 added to system PATH"
    fi

    mark_step_complete "pm2"
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
    skip_if_complete "setup_application" "Application setup" && return 0

    log_step "Setting Up Application"

    INSTALL_DIR="/var/www/alewo-callback"

    # Create directory if not exists
    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR" || {
            log_error "Failed to create directory: $INSTALL_DIR"
            return 1
        }
        log_info "Created directory: $INSTALL_DIR"
    fi

    # Copy files
    log_info "Copying application files..."
    cp -r ./* "$INSTALL_DIR/" || {
        log_error "Failed to copy application files"
        return 1
    }
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
    mark_step_complete "setup_application"
}

# Install dependencies
install_dependencies() {
    skip_if_complete "dependencies" "Application dependencies installation" && return 0

    log_step "Installing Application Dependencies"

    cd "$INSTALL_DIR"

    log_info "Installing backend dependencies..."
    npm install --production || {
        log_error "Backend dependencies installation failed"
        return 1
    }

    log_info "Installing frontend dependencies..."
    cd client
    npm install || {
        log_error "Frontend dependencies installation failed"
        return 1
    }

    log_info "Building frontend..."
    npm run build || {
        log_error "Frontend build failed"
        return 1
    }

    cd "$INSTALL_DIR"
    log_success "Dependencies installed and frontend built"
    mark_step_complete "dependencies"
}

# Create admin user
create_admin_user() {
    skip_if_complete "admin_user" "Administrator account creation" && return 0

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
    node setup-admin.js || {
        log_error "Failed to create admin user"
        rm -f setup-admin.js
        return 1
    }

    # Remove setup script
    rm setup-admin.js

    log_success "Administrator account created"
    mark_step_complete "admin_user"
}

# Dynamic DNS Provider Detection
detect_dns_provider() {
    local DOMAIN_TO_CHECK="$1"
    local NAMESERVERS=$(dig +short NS "$DOMAIN_TO_CHECK" @8.8.8.8 2>/dev/null | head -n3)

    if [ -z "$NAMESERVERS" ]; then
        echo "unknown"
        return
    fi

    # Check various providers
    if echo "$NAMESERVERS" | grep -qi "cloudflare\|ns.*cloudflare"; then
        echo "cloudflare"
    elif echo "$NAMESERVERS" | grep -qi "hostinger\|idwebhost"; then
        echo "hostinger"
    elif echo "$NAMESERVERS" | grep -qi "namecheap"; then
        echo "namecheap"
    elif echo "$NAMESERVERS" | grep -qi "godaddy"; then
        echo "godaddy"
    elif echo "$NAMESERVERS" | grep -qi "google\|ns-cloud"; then
        echo "google"
    elif echo "$NAMESERVERS" | grep -qi "digitalocean"; then
        echo "digitalocean"
    elif echo "$NAMESERVERS" | grep -qi "linode\|akamai"; then
        echo "linode"
    elif echo "$NAMESERVERS" | grep -qi "route53\|awsdns"; then
        echo "aws"
    elif echo "$NAMESERVERS" | grep -qi "azure"; then
        echo "azure"
    elif echo "$NAMESERVERS" | grep -qi "ovh"; then
        echo "ovh"
    elif echo "$NAMESERVERS" | grep -qi "ionos\|1and1"; then
        echo "ionos"
    elif echo "$NAMESERVERS" | grep -qi "hover"; then
        echo "hover"
    elif echo "$NAMESERVERS" | grep -qi "porkbun"; then
        echo "porkbun"
    elif echo "$NAMESERVERS" | grep -qi "namesilo"; then
        echo "namesilo"
    else
        echo "other"
    fi
}

# Get provider-specific DNS management URL
get_provider_dns_url() {
    local PROVIDER="$1"
    local DOMAIN="$2"

    case "$PROVIDER" in
        cloudflare)
            echo "https://dash.cloudflare.com/"
            ;;
        hostinger)
            echo "https://hpanel.hostinger.com/domain/$DOMAIN/dns"
            ;;
        namecheap)
            echo "https://ap.www.namecheap.com/domains/dns/default/$DOMAIN"
            ;;
        godaddy)
            echo "https://dcc.godaddy.com/manage/$DOMAIN/dns"
            ;;
        google)
            echo "https://domains.google.com/registrar/$DOMAIN/dns"
            ;;
        digitalocean)
            echo "https://cloud.digitalocean.com/networking/domains/$DOMAIN"
            ;;
        linode)
            echo "https://cloud.linode.com/domains/$DOMAIN"
            ;;
        aws)
            echo "https://console.aws.amazon.com/route53/v2/hostedzones"
            ;;
        azure)
            echo "https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Network%2FdnsZones"
            ;;
        ovh)
            echo "https://www.ovh.com/manager/web/#/configuration/domain/$DOMAIN/zone"
            ;;
        ionos)
            echo "https://my.ionos.com/domains/$DOMAIN/dns"
            ;;
        hover)
            echo "https://www.hover.com/domains/$DOMAIN/dns"
            ;;
        porkbun)
            echo "https://porkbun.com/account/domainsSpeedy"
            ;;
        namesilo)
            echo "https://www.namesilo.com/account_domains.php"
            ;;
        *)
            echo "https://www.google.com/search?q=how+to+add+dns+record+$PROVIDER"
            ;;
    esac
}

# Get provider display name
get_provider_name() {
    local PROVIDER="$1"

    case "$PROVIDER" in
        cloudflare) echo "Cloudflare" ;;
        hostinger) echo "Hostinger" ;;
        namecheap) echo "Namecheap" ;;
        godaddy) echo "GoDaddy" ;;
        google) echo "Google Domains" ;;
        digitalocean) echo "DigitalOcean" ;;
        linode) echo "Linode/Akamai" ;;
        aws) echo "AWS Route53" ;;
        azure) echo "Azure DNS" ;;
        ovh) echo "OVH" ;;
        ionos) echo "IONOS" ;;
        hover) echo "Hover" ;;
        porkbun) echo "Porkbun" ;;
        namesilo) echo "NameSilo" ;;
        other) echo "Your DNS Provider" ;;
        unknown) echo "Unknown Provider" ;;
        *) echo "$PROVIDER" ;;
    esac
}

# Show DNS configuration guide
show_dns_configuration_guide() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║              DNS CONFIGURATION REQUIRED                   ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Please add these DNS records to your domain:${NC}"
    echo ""
    echo "┌───────────────────────────────────────────────────────────────┐"
    printf "│  ${GREEN}%-6s${NC}  %-25s  %-25s │\n" "Type" "Name" "Value"
    echo "├───────────────────────────────────────────────────────────────┤"
    printf "│  ${GREEN}%-6s${NC}  %-25s  %-25s │\n" "A" "$DOMAIN" "$PUBLIC_IP"
    printf "│  ${GREEN}%-6s${NC}  %-25s  %-25s │\n" "A" "*.$DOMAIN" "$PUBLIC_IP"
    printf "│  ${GREEN}%-6s${NC}  %-25s  %-25s │\n" "NS" "$DOMAIN" "ns1.$DOMAIN"
    printf "│  ${GREEN}%-6s${NC}  %-25s  %-25s │\n" "A" "ns1.$DOMAIN" "$PUBLIC_IP"
    echo "└───────────────────────────────────────────────────────────────┘"
    echo ""

    # Detect and show provider
    DNS_PROVIDER=$(detect_dns_provider "$DOMAIN")
    PROVIDER_NAME=$(get_provider_name "$DNS_PROVIDER")
    PROVIDER_URL=$(get_provider_dns_url "$DNS_PROVIDER" "$DOMAIN")

    echo -e "${CYAN}Your DNS Provider:${NC} ${GREEN}$PROVIDER_NAME${NC}"
    echo -e "${CYAN}DNS Management URL:${NC} ${BLUE}$PROVIDER_URL${NC}"
    echo ""

    echo -e "${YELLOW}Important Notes:${NC}"
    echo "  • DNS propagation can take 5-30 minutes"
    echo "  • Wildcard record (*.$DOMAIN) is required for callback subdomains"
    echo "  • NS record is optional but recommended for custom DNS server"
    echo ""
    echo -e "${CYAN}Verify DNS propagation:${NC}"
    echo "  dig $DOMAIN @8.8.8.8"
    echo "  dig test.$DOMAIN @8.8.8.8"
    echo "  Online: https://dnschecker.org"
    echo ""
}

# Check DNS records
check_dns_records() {
    local DOMAIN_TO_CHECK="$1"
    local EXPECTED_IP="$2"
    local DNS_READY=true

    echo ""
    log_info "Verifying DNS configuration..."
    echo ""

    # Check A record for main domain
    echo -ne "  Checking A record for $DOMAIN_TO_CHECK... "
    A_RECORD=$(dig +short "$DOMAIN_TO_CHECK" @8.8.8.8 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1)
    if [ "$A_RECORD" == "$EXPECTED_IP" ]; then
        echo -e "${GREEN}✓${NC} ($A_RECORD)"
    else
        echo -e "${RED}✗${NC}"
        echo -e "    Expected: ${GREEN}$EXPECTED_IP${NC}"
        echo -e "    Got: ${YELLOW}${A_RECORD:-Not found}${NC}"
        DNS_READY=false
    fi

    # Check wildcard A record
    echo -ne "  Checking wildcard A record for *.$DOMAIN_TO_CHECK... "
    TEST_SUBDOMAIN="test-$(date +%s).$DOMAIN_TO_CHECK"
    WILDCARD_RECORD=$(dig +short "$TEST_SUBDOMAIN" @8.8.8.8 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1)
    if [ "$WILDCARD_RECORD" == "$EXPECTED_IP" ]; then
        echo -e "${GREEN}✓${NC} ($WILDCARD_RECORD)"
    else
        echo -e "${RED}✗${NC}"
        echo -e "    Expected: ${GREEN}$EXPECTED_IP${NC}"
        echo -e "    Got: ${YELLOW}${WILDCARD_RECORD:-Not found}${NC}"
        DNS_READY=false
    fi

    # Check NS record (optional)
    echo -ne "  Checking NS record for $DOMAIN_TO_CHECK... "
    NS_RECORD=$(dig +short NS "$DOMAIN_TO_CHECK" @8.8.8.8 2>/dev/null | head -n1)
    if [ -n "$NS_RECORD" ]; then
        echo -e "${GREEN}✓${NC} (${NS_RECORD%.})"
    else
        echo -e "${YELLOW}⚠${NC} (Optional, not configured)"
    fi

    echo ""

    if [ "$DNS_READY" = false ]; then
        return 1
    else
        return 0
    fi
}

# Verify TXT record propagation
verify_txt_record() {
    local TXT_NAME="$1"
    local TXT_VALUE="$2"
    local MAX_ATTEMPTS=12
    local ATTEMPT=0

    echo ""
    log_info "Verifying DNS TXT record propagation..."
    echo ""

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))

        # Check multiple DNS servers
        local DNS_SERVERS=("8.8.8.8" "1.1.1.1" "208.67.222.222")
        local SUCCESS_COUNT=0

        for DNS_SERVER in "${DNS_SERVERS[@]}"; do
            TXT_RESULT=$(dig +short TXT "$TXT_NAME" @$DNS_SERVER 2>/dev/null | tr -d '"' | head -n1)

            if [ "$TXT_RESULT" == "$TXT_VALUE" ]; then
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            fi
        done

        # Progress indicator
        local PROGRESS_BAR=""
        for i in $(seq 1 $SUCCESS_COUNT); do
            PROGRESS_BAR="${PROGRESS_BAR}█"
        done
        for i in $(seq $((SUCCESS_COUNT + 1)) 3); do
            PROGRESS_BAR="${PROGRESS_BAR}░"
        done

        echo -ne "\r  Attempt $ATTEMPT/$MAX_ATTEMPTS - Verified on $SUCCESS_COUNT/3 DNS servers [$PROGRESS_BAR]"

        if [ $SUCCESS_COUNT -eq 3 ]; then
            echo ""
            echo ""
            log_success "TXT record verified on all DNS servers!"
            return 0
        fi

        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            sleep 10
        fi
    done

    echo ""
    echo ""
    log_warning "DNS propagation taking longer than expected"

    if confirm "Continue anyway? (Not recommended)"; then
        return 0
    else
        return 1
    fi
}

# Show TXT record instruction
show_txt_record_instruction() {
    local TXT_NAME="$1"
    local TXT_VALUE="$2"
    local ATTEMPT="$3"

    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║           DNS TXT RECORD VERIFICATION REQUIRED                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [ "$ATTEMPT" -gt 1 ]; then
        echo -e "${YELLOW}⚠ Attempt $ATTEMPT - Previous verification failed${NC}\n"
    fi

    echo -e "${CYAN}Please add the following TXT record to your DNS:${NC}\n"

    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                                                             │"
    echo -e "│  ${GREEN}Record Type:${NC}  TXT                                        │"
    echo -e "│  ${GREEN}Name/Host:${NC}    ${YELLOW}$TXT_NAME${NC}"
    echo -e "│  ${GREEN}Value:${NC}        ${YELLOW}$TXT_VALUE${NC}"
    echo -e "│  ${GREEN}TTL:${NC}          300 (5 minutes) or Auto                  │"
    echo "│                                                             │"
    echo "└─────────────────────────────────────────────────────────────┘"

    echo ""

    # Detect and show provider info
    DNS_PROVIDER=$(detect_dns_provider "$DOMAIN")
    PROVIDER_NAME=$(get_provider_name "$DNS_PROVIDER")
    PROVIDER_URL=$(get_provider_dns_url "$DNS_PROVIDER" "$DOMAIN")

    echo -e "${CYAN}Your DNS Provider:${NC} ${GREEN}$PROVIDER_NAME${NC}"
    echo -e "${CYAN}DNS Management:${NC} ${BLUE}$PROVIDER_URL${NC}"

    echo ""
    echo -e "${YELLOW}Steps:${NC}"
    echo "  1. Open your DNS management panel using the link above"
    echo "  2. Add a new TXT record with the details shown"
    echo "  3. Wait 2-5 minutes for DNS propagation"
    echo "  4. Press ENTER to verify"
    echo ""

    echo -e "${CYAN}Need help?${NC}"
    echo "  • Check DNS propagation: https://dnschecker.org/#TXT/$TXT_NAME"
    echo "  • Manual check: dig TXT $TXT_NAME @8.8.8.8"
    echo ""
}

# Setup SSL with interactive options
setup_ssl() {
    skip_if_complete "ssl_setup" "SSL setup" && return 0

    if [ "$USE_SSL" = true ]; then
        log_step "SSL Certificate Setup"

        # Check if it's IP address
        if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_warning "SSL cannot be used with IP address"
            setup_self_signed_ssl
            mark_step_complete "ssl_setup"
            return
        fi

        # Check if Let's Encrypt certificate already exists
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            log_warning "Let's Encrypt certificate already exists for $DOMAIN"

            # Check certificate validity
            local CERT_VALID=false
            local CERT_EXPIRY=""

            if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" >/dev/null 2>&1; then
                CERT_VALID=true
                CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" 2>/dev/null | cut -d= -f2)
            fi

            echo ""
            echo -e "${CYAN}Existing Certificate Information:${NC}"
            if [ "$CERT_VALID" = true ]; then
                echo -e "  ${GREEN}Status:${NC} Valid"
                echo -e "  ${GREEN}Expires:${NC} $CERT_EXPIRY"
            else
                echo -e "  ${RED}Status:${NC} Expired or Invalid"
            fi
            echo ""
            echo -e "${CYAN}Certificate Options:${NC}"
            echo ""
            echo "  1. Renew/Replace existing certificate (DNS Challenge - Recommended)"
            echo "  2. Keep existing certificate (only if valid)"
            echo "  3. Delete and create fresh certificate"
            echo ""

            read -p "Select option [1-3] (default: 1): " CERT_OPTION
            CERT_OPTION=${CERT_OPTION:-1}

            case $CERT_OPTION in
                1)
                    log_info "Renewing/Replacing existing Let's Encrypt certificate"
                    # Delete old certificate first
                    log_info "Removing old certificate..."
                    certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
                    rm -rf "/etc/letsencrypt/live/$DOMAIN"
                    rm -rf "/etc/letsencrypt/archive/$DOMAIN"
                    rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf"
                    log_success "Old certificate removed"
                    # Setup new certificate
                    setup_letsencrypt_dns_challenge
                    ;;
                2)
                    if [ "$CERT_VALID" = true ]; then
                        log_info "Keeping existing valid certificate"
                        mark_step_complete "ssl_setup"
                        return 0
                    else
                        log_error "Certificate is expired or invalid. Cannot keep it."
                        log_info "Switching to option 1: Renew certificate"
                        # Delete old certificate
                        certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
                        rm -rf "/etc/letsencrypt/live/$DOMAIN"
                        rm -rf "/etc/letsencrypt/archive/$DOMAIN"
                        rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf"
                        setup_letsencrypt_dns_challenge
                    fi
                    ;;
                3)
                    log_warning "This will permanently delete the existing certificate"
                    if confirm "Are you sure you want to continue?"; then
                        log_info "Deleting old certificate..."
                        certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
                        rm -rf "/etc/letsencrypt/live/$DOMAIN"
                        rm -rf "/etc/letsencrypt/archive/$DOMAIN"
                        rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf"
                        log_success "Old certificate deleted"
                        setup_letsencrypt_dns_challenge
                    else
                        log_info "Keeping existing certificate"
                        mark_step_complete "ssl_setup"
                        return 0
                    fi
                    ;;
                *)
                    log_warning "Invalid option. Defaulting to option 1 (Renew)"
                    certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
                    rm -rf "/etc/letsencrypt/live/$DOMAIN"
                    rm -rf "/etc/letsencrypt/archive/$DOMAIN"
                    rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf"
                    setup_letsencrypt_dns_challenge
                    ;;
            esac
        else
            # No existing certificate, show SSL setup options
            echo ""
            echo -e "${CYAN}SSL Setup Options:${NC}"
            echo ""
            echo "  1. Let's Encrypt with DNS Challenge (Wildcard support, 90 days)"
            echo "  2. Let's Encrypt with HTTP Challenge (No wildcard, 90 days)"
            echo "  3. Cloudflare Origin Certificate (${GREEN}RECOMMENDED${NC} - 15 years, no rate limit)"
            echo "  4. acme.sh with Cloudflare API (Auto DNS challenge, 90 days)"
            echo "  5. Self-signed Certificate (Development only)"
            echo "  6. Skip SSL setup (Use HTTP only)"
            echo ""
            echo -e "${YELLOW}Rate Limits:${NC}"
            echo "  • Let's Encrypt: 5 certificates per week"
            echo "  • Cloudflare Origin: NO LIMITS (Requires Cloudflare proxy)"
            echo "  • acme.sh: Same as Let's Encrypt (can use ZeroSSL)"
            echo ""

            read -p "Select option [1-6] (default: 3): " SSL_OPTION
            SSL_OPTION=${SSL_OPTION:-3}

            case $SSL_OPTION in
                1)
                    setup_letsencrypt_dns_challenge
                    ;;
                2)
                    setup_letsencrypt_http_challenge
                    ;;
                3)
                    setup_cloudflare_origin_cert
                    ;;
                4)
                    setup_acme_sh
                    ;;
                5)
                    setup_self_signed_ssl
                    ;;
                6)
                    log_info "Skipping SSL setup"
                    USE_SSL=false
                    ;;
                *)
                    log_warning "Invalid option, using Cloudflare Origin Certificate..."
                    setup_cloudflare_origin_cert
                    ;;
            esac
        fi
    else
        log_info "Skipping SSL setup"
    fi

    mark_step_complete "ssl_setup"
}

# Let's Encrypt DNS Challenge
setup_letsencrypt_dns_challenge() {
    log_step "Let's Encrypt - DNS Challenge Setup"

    # Install required tools
    apt-get install -y dnsutils >/dev/null 2>&1

    # Check DNS records first
    show_dns_configuration_guide

    if ! confirm "Have you configured the required DNS records?"; then
        log_error "Please configure DNS records first"
        setup_self_signed_ssl
        return
    fi

    log_info "Waiting 10 seconds for DNS propagation..."
    sleep 10

    # Verify DNS
    if ! check_dns_records "$DOMAIN" "$PUBLIC_IP"; then
        log_warning "DNS records not fully configured"

        if ! confirm "Continue anyway? (May fail)"; then
            setup_self_signed_ssl
            return
        fi
    fi

    echo ""
    log_info "Starting Let's Encrypt certificate request..."
    log_warning "This requires manual DNS TXT record verification"
    echo ""

    if ! confirm "Ready to continue?"; then
        setup_self_signed_ssl
        return
    fi

    # Stop nginx temporarily
    systemctl stop nginx 2>/dev/null

    # Check if user wants staging/testing environment
    echo ""
    echo -e "${YELLOW}⚠️  Let's Encrypt has rate limits:${NC}"
    echo "  • 5 certificates per domain per week"
    echo "  • Use staging environment for testing"
    echo ""
    echo -e "${CYAN}Certificate Environment:${NC}"
    echo "  1. Production (real certificate - counts toward rate limit)"
    echo "  2. Staging (test certificate - does NOT count toward rate limit)"
    echo ""
    read -p "Select environment [1-2] (default: 1): " CERT_ENV
    CERT_ENV=${CERT_ENV:-1}

    STAGING_FLAG=""
    if [ "$CERT_ENV" = "2" ]; then
        STAGING_FLAG="--test-cert"
        log_info "Using Let's Encrypt STAGING environment (test certificate)"
        log_warning "Staging certificates will show as untrusted in browsers"
    else
        log_info "Using Let's Encrypt PRODUCTION environment"
    fi

    # Manual DNS challenge
    echo ""
    log_info "Please follow the instructions carefully..."
    echo ""

    # Run certbot with manual DNS challenge - capture output
    CERTBOT_LOG="/tmp/certbot-output-$$.log"
    certbot certonly --manual \
        --preferred-challenges dns \
        -d "$DOMAIN" \
        -d "*.$DOMAIN" \
        --email "$ADMIN_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --manual-public-ip-logging-ok \
        $STAGING_FLAG 2>&1 | tee "$CERTBOT_LOG"

    CERT_EXIT=$?

    # Start nginx back
    systemctl start nginx 2>/dev/null

    # Check for rate limit error
    if grep -q "too many certificates" "$CERTBOT_LOG" 2>/dev/null; then
        # Extract retry date
        RETRY_DATE=$(grep -oP "retry after \K[^:]*" "$CERTBOT_LOG" 2>/dev/null || echo "unknown")

        echo ""
        log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_error "Let's Encrypt RATE LIMIT REACHED"
        log_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo -e "${RED}You've reached the Let's Encrypt rate limit!${NC}"
        echo ""
        echo -e "${YELLOW}What happened:${NC}"
        echo "  • Let's Encrypt allows max 5 certificates per domain per week"
        echo "  • Your domain already has 5 certificates issued recently"
        echo "  • Retry after: ${CYAN}$RETRY_DATE${NC}"
        echo ""
        echo -e "${CYAN}Available Solutions:${NC}"
        echo ""
        echo "  ${GREEN}Option 1: Use Staging Environment for Testing${NC}"
        echo "    • Run: sudo bash install.sh (select option 2 when asked)"
        echo "    • Staging certificates don't count toward rate limit"
        echo "    • Perfect for testing and development"
        echo ""
        echo "  ${GREEN}Option 2: Wait Until Rate Limit Resets${NC}"
        echo "    • Wait until: ${CYAN}$RETRY_DATE${NC}"
        echo "    • Then run installer again"
        echo ""
        echo "  ${GREEN}Option 3: Use Self-Signed Certificate (Now)${NC}"
        echo "    • Works immediately"
        echo "    • Browser will show security warning"
        echo "    • Good for development/testing"
        echo ""
        echo -e "${YELLOW}Learn more:${NC} https://letsencrypt.org/docs/rate-limits/"
        echo ""

        rm -f "$CERTBOT_LOG"

        read -p "$(echo -e ${YELLOW}Use self-signed certificate for now? ${NC}[Y/n]: )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            log_info "Creating self-signed certificate..."
            setup_self_signed_ssl
            return 1
        else
            log_error "Installation cannot continue without SSL certificate"
            exit 1
        fi
    fi

    # Check if certificate was successfully obtained
    if [ $CERT_EXIT -eq 0 ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        rm -f "$CERTBOT_LOG"
        log_success "SSL certificate obtained successfully!"

        if [ "$CERT_ENV" = "2" ]; then
            log_warning "This is a STAGING certificate (not trusted by browsers)"
            log_info "To get a production certificate, wait for rate limit reset"
        else
            log_warning "Manual DNS challenge certificates require manual renewal"
            log_info "Certificate expires in 90 days - you'll need to run certbot again"
        fi

        setup_cert_renewal
        return 0
    else
        rm -f "$CERTBOT_LOG"
        log_error "Failed to obtain SSL certificate"
        log_info "Falling back to self-signed certificate..."
        setup_self_signed_ssl
        return 1
    fi
}

# Let's Encrypt HTTP Challenge (no wildcard)
setup_letsencrypt_http_challenge() {
    log_step "Let's Encrypt - HTTP Challenge Setup"

    log_warning "HTTP challenge does NOT support wildcard certificates"
    log_info "Only $DOMAIN will be certified, not *.$DOMAIN"
    log_warning "Callback subdomains will NOT have valid SSL!"
    echo ""

    if ! confirm "Continue with HTTP challenge?"; then
        setup_letsencrypt_dns_challenge
        return
    fi

    # Stop nginx
    systemctl stop nginx 2>/dev/null

    # Get certificate
    certbot certonly --standalone \
        -d "$DOMAIN" \
        --email "$ADMIN_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive

    CERT_EXIT=$?

    # Start nginx back
    systemctl start nginx 2>/dev/null

    if [ $CERT_EXIT -eq 0 ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        log_success "SSL certificate obtained"
        setup_cert_renewal
        return 0
    else
        log_error "Failed to obtain certificate"
        setup_self_signed_ssl
        return 1
    fi
}

# Self-signed SSL
setup_self_signed_ssl() {
    log_info "Creating self-signed SSL certificate..."

    mkdir -p /etc/ssl/alewo-callback

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/alewo-callback/privkey.pem \
        -out /etc/ssl/alewo-callback/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=*.$DOMAIN" \
        >/dev/null 2>&1

    # Update .env
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/ssl/alewo-callback/privkey.pem|g" "$INSTALL_DIR/.env"
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/ssl/alewo-callback/fullchain.pem|g" "$INSTALL_DIR/.env"

    log_success "Self-signed SSL certificate created"
    log_warning "Browsers will show security warning for self-signed certificates"
}

# Setup certificate auto-renewal
setup_cert_renewal() {
    log_info "Setting up auto-renewal..."

    # Create renewal hook directory
    mkdir -p /etc/letsencrypt/renewal-hooks/post

    # Create reload script
    cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF

    chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

    # Add cron job for renewal
    (crontab -l 2>/dev/null | grep -v "certbot renew"; \
     echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx' >/dev/null 2>&1") | crontab -

    log_success "Auto-renewal configured (checks twice daily)"
}

# Cloudflare Origin Certificate Setup
setup_cloudflare_origin_cert() {
    log_step "Cloudflare Origin Certificate Setup"

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Cloudflare Origin Certificate - 15 Years, No Rate Limit ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Benefits:${NC}"
    echo "  ✓ Valid for 15 years (no renewal needed)"
    echo "  ✓ NO rate limits"
    echo "  ✓ Automatic wildcard support"
    echo "  ✓ Works with Nginx"
    echo "  ✓ Free forever"
    echo ""
    echo -e "${YELLOW}Requirements:${NC}"
    echo "  • Domain must be added to Cloudflare (free)"
    echo "  • Cloudflare proxy (orange cloud) must be enabled"
    echo "  • SSL/TLS mode must be set to 'Full (strict)'"
    echo ""

    if ! confirm "Have you added $DOMAIN to Cloudflare and updated nameservers?"; then
        log_warning "You need to add your domain to Cloudflare first"
        echo ""
        echo -e "${CYAN}Steps to add domain to Cloudflare:${NC}"
        echo "  1. Go to: https://dash.cloudflare.com"
        echo "  2. Click 'Add a Site'"
        echo "  3. Enter domain: $DOMAIN"
        echo "  4. Select Free Plan"
        echo "  5. Update nameservers at your domain registrar"
        echo "  6. Wait 5-30 minutes for propagation"
        echo ""

        if ! confirm "Continue anyway? (Setup will fail if not configured)"; then
            setup_self_signed_ssl
            return 1
        fi
    fi

    echo ""
    echo -e "${CYAN}Generate Cloudflare Origin Certificate:${NC}"
    echo ""
    echo "  1. Go to: ${BLUE}https://dash.cloudflare.com${NC}"
    echo "  2. Select your domain: ${CYAN}$DOMAIN${NC}"
    echo "  3. Navigate to: ${YELLOW}SSL/TLS → Origin Server${NC}"
    echo "  4. Click: ${GREEN}Create Certificate${NC}"
    echo ""
    echo -e "${CYAN}Certificate Configuration:${NC}"
    echo "  • Private key type: ${YELLOW}RSA (2048)${NC}"
    echo "  • Hostnames: ${CYAN}$DOMAIN, *.$DOMAIN${NC}"
    echo "  • Certificate validity: ${GREEN}15 years${NC}"
    echo ""
    echo "  5. Click ${GREEN}Create${NC}"
    echo ""

    if ! confirm "Have you generated the Origin Certificate?"; then
        log_error "Please generate the certificate first"
        setup_self_signed_ssl
        return 1
    fi

    # Create SSL directory
    mkdir -p /etc/nginx/ssl
    chmod 755 /etc/nginx/ssl

    # Get Origin Certificate
    echo ""
    log_info "Please copy the ORIGIN CERTIFICATE from Cloudflare..."
    echo -e "${YELLOW}(Copy ENTIRE content including -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----)${NC}"
    echo ""
    echo "Press Enter when ready, then paste the certificate (Ctrl+D when done):"
    read -r

    CERT_FILE="/etc/nginx/ssl/$DOMAIN.cert"
    cat > "$CERT_FILE"

    if [ ! -s "$CERT_FILE" ]; then
        log_error "Certificate file is empty!"
        rm -f "$CERT_FILE"
        setup_self_signed_ssl
        return 1
    fi

    # Validate certificate format
    if ! openssl x509 -in "$CERT_FILE" -noout 2>/dev/null; then
        log_error "Invalid certificate format!"
        rm -f "$CERT_FILE"
        setup_self_signed_ssl
        return 1
    fi

    chmod 644 "$CERT_FILE"
    log_success "Origin Certificate saved"

    # Get Private Key
    echo ""
    log_info "Please copy the PRIVATE KEY from Cloudflare..."
    echo -e "${YELLOW}(Copy ENTIRE content including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)${NC}"
    echo ""
    echo "Press Enter when ready, then paste the private key (Ctrl+D when done):"
    read -r

    KEY_FILE="/etc/nginx/ssl/$DOMAIN.key"
    cat > "$KEY_FILE"

    if [ ! -s "$KEY_FILE" ]; then
        log_error "Private key file is empty!"
        rm -f "$KEY_FILE" "$CERT_FILE"
        setup_self_signed_ssl
        return 1
    fi

    # Validate private key format
    if ! openssl rsa -in "$KEY_FILE" -check -noout 2>/dev/null; then
        log_error "Invalid private key format!"
        rm -f "$KEY_FILE" "$CERT_FILE"
        setup_self_signed_ssl
        return 1
    fi

    chmod 600 "$KEY_FILE"
    log_success "Private Key saved and secured"

    # Verify certificate and key match
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_FILE" 2>/dev/null | openssl md5)
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5)

    if [ "$CERT_MODULUS" != "$KEY_MODULUS" ]; then
        log_error "Certificate and Private Key do not match!"
        rm -f "$KEY_FILE" "$CERT_FILE"
        setup_self_signed_ssl
        return 1
    fi

    log_success "Certificate and Private Key validated successfully!"

    # Update .env to use Cloudflare certificate
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=$KEY_FILE|g" "$INSTALL_DIR/.env"
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=$CERT_FILE|g" "$INSTALL_DIR/.env"

    # Show final instructions
    echo ""
    echo -e "${GREEN}✓ Cloudflare Origin Certificate installed successfully!${NC}"
    echo ""
    echo -e "${CYAN}IMPORTANT - Complete Cloudflare Configuration:${NC}"
    echo ""
    echo "  1. ${YELLOW}Enable Cloudflare Proxy (Orange Cloud):${NC}"
    echo "     • Go to: ${BLUE}DNS → Records${NC}"
    echo "     • Enable orange cloud for:"
    echo "       - Type A, Name: ${CYAN}$DOMAIN${NC} → Click to turn ${YELLOW}Proxied${NC}"
    echo "       - Type A, Name: ${CYAN}*${NC} → Click to turn ${YELLOW}Proxied${NC}"
    echo ""
    echo "  2. ${YELLOW}Set SSL/TLS Mode to Full (strict):${NC}"
    echo "     • Go to: ${BLUE}SSL/TLS → Overview${NC}"
    echo "     • Select: ${GREEN}Full (strict)${NC}"
    echo ""
    echo -e "${GREEN}Certificate Details:${NC}"
    echo "  • Validity: ${CYAN}15 years${NC} (no renewal needed!)"
    echo "  • Wildcard: ${CYAN}✓ Supported${NC} (*.$DOMAIN)"
    echo "  • Rate Limit: ${GREEN}NONE${NC}"
    echo "  • Certificate: ${BLUE}$CERT_FILE${NC}"
    echo "  • Private Key: ${BLUE}$KEY_FILE${NC}"
    echo ""

    return 0
}

# acme.sh with Cloudflare API Setup
setup_acme_sh() {
    log_step "acme.sh with Cloudflare API Setup"

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       acme.sh - Automatic DNS Challenge with API         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Benefits:${NC}"
    echo "  ✓ Automatic DNS challenge (no manual TXT records)"
    echo "  ✓ Automatic renewal every 60 days"
    echo "  ✓ Wildcard certificate support"
    echo "  ✓ Can use ZeroSSL (no rate limits)"
    echo ""
    echo -e "${YELLOW}Requirements:${NC}"
    echo "  • Cloudflare account (free)"
    echo "  • Cloudflare API Token"
    echo ""

    # Install acme.sh if not exists
    if [ ! -d "/root/.acme.sh" ]; then
        log_info "Installing acme.sh..."

        if ! curl -sSL https://get.acme.sh | sh -s email="$ADMIN_EMAIL" >/dev/null 2>&1; then
            log_error "Failed to install acme.sh"
            setup_self_signed_ssl
            return 1
        fi

        # Source acme.sh
        source ~/.bashrc 2>/dev/null || true

        log_success "acme.sh installed"
    else
        log_info "acme.sh already installed"
    fi

    ACME="/root/.acme.sh/acme.sh"

    # Get Cloudflare API credentials
    echo ""
    echo -e "${CYAN}Get Cloudflare API Token:${NC}"
    echo ""
    echo "  1. Go to: ${BLUE}https://dash.cloudflare.com/profile/api-tokens${NC}"
    echo "  2. Click: ${GREEN}Create Token${NC}"
    echo "  3. Use template: ${YELLOW}Edit zone DNS${NC}"
    echo "  4. Zone Resources: ${CYAN}Include → Specific zone → $DOMAIN${NC}"
    echo "  5. Click: ${GREEN}Continue to summary${NC} → ${GREEN}Create Token${NC}"
    echo "  6. Copy the token (starts with: ${YELLOW}ey...${NC})"
    echo ""

    read -p "Enter Cloudflare API Token: " CF_Token

    if [ -z "$CF_Token" ]; then
        log_error "API Token is required"
        setup_self_signed_ssl
        return 1
    fi

    export CF_Token="$CF_Token"

    # Ask for certificate provider
    echo ""
    echo -e "${CYAN}Certificate Provider:${NC}"
    echo ""
    echo "  1. Let's Encrypt (Default, rate limit: 5/week)"
    echo "  2. ZeroSSL (No strict rate limits)"
    echo ""
    read -p "Select provider [1-2] (default: 2): " CERT_PROVIDER
    CERT_PROVIDER=${CERT_PROVIDER:-2}

    SERVER_FLAG=""
    if [ "$CERT_PROVIDER" = "2" ]; then
        log_info "Registering with ZeroSSL..."
        $ACME --register-account -m "$ADMIN_EMAIL" --server zerossl >/dev/null 2>&1 || true
        SERVER_FLAG="--server zerossl"
        log_success "Using ZeroSSL (no strict rate limits)"
    else
        log_info "Using Let's Encrypt"
    fi

    # Issue certificate
    log_info "Issuing certificate via Cloudflare DNS API..."
    echo -e "${YELLOW}This may take 1-2 minutes...${NC}"
    echo ""

    mkdir -p /etc/nginx/ssl

    if ! $ACME --issue --dns dns_cf -d "$DOMAIN" -d "*.$DOMAIN" $SERVER_FLAG 2>&1; then
        log_error "Failed to issue certificate"
        log_info "Falling back to self-signed certificate..."
        unset CF_Token
        setup_self_signed_ssl
        return 1
    fi

    log_success "Certificate issued successfully!"

    # Install certificate to Nginx paths
    log_info "Installing certificate to Nginx..."

    if ! $ACME --install-cert -d "$DOMAIN" \
        --key-file "/etc/nginx/ssl/$DOMAIN.key" \
        --fullchain-file "/etc/nginx/ssl/$DOMAIN.cert" \
        --reloadcmd "systemctl reload nginx" 2>&1; then
        log_error "Failed to install certificate"
        setup_self_signed_ssl
        return 1
    fi

    # Secure permissions
    chmod 600 "/etc/nginx/ssl/$DOMAIN.key"
    chmod 644 "/etc/nginx/ssl/$DOMAIN.cert"

    # Update .env
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/nginx/ssl/$DOMAIN.key|g" "$INSTALL_DIR/.env"
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/nginx/ssl/$DOMAIN.cert|g" "$INSTALL_DIR/.env"

    # Clean up sensitive environment variable
    unset CF_Token

    log_success "Certificate installed to Nginx!"

    echo ""
    echo -e "${GREEN}✓ acme.sh setup completed!${NC}"
    echo ""
    echo -e "${CYAN}Auto-Renewal:${NC}"
    echo "  • acme.sh will automatically renew certificates every 60 days"
    echo "  • Cron job already configured"
    echo "  • Nginx will auto-reload after renewal"
    echo ""
    echo -e "${GREEN}Certificate Details:${NC}"
    echo "  • Validity: ${CYAN}90 days${NC} (auto-renews at 60 days)"
    echo "  • Wildcard: ${CYAN}✓ Supported${NC} (*.$DOMAIN)"
    echo "  • Provider: $([ "$CERT_PROVIDER" = "2" ] && echo "${GREEN}ZeroSSL${NC}" || echo "${CYAN}Let's Encrypt${NC}")"
    echo "  • Certificate: ${BLUE}/etc/nginx/ssl/$DOMAIN.cert${NC}"
    echo "  • Private Key: ${BLUE}/etc/nginx/ssl/$DOMAIN.key${NC}"
    echo ""

    return 0
}

# Configure Nginx
configure_nginx() {
    skip_if_complete "nginx_config" "Nginx configuration" && return 0

    log_step "Configuring Nginx"

    if [ "$USE_SSL" = true ]; then
        PROTOCOL="https"

        # Priority: Cloudflare/acme.sh > Let's Encrypt > Self-signed
        if [ -f "/etc/nginx/ssl/$DOMAIN.cert" ]; then
            # Use Cloudflare Origin Certificate or acme.sh certificate
            SSL_CONFIG="
    ssl_certificate /etc/nginx/ssl/$DOMAIN.cert;
    ssl_certificate_key /etc/nginx/ssl/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
"
            log_info "Using Cloudflare/acme.sh certificate for Nginx"
        elif [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            # Use Let's Encrypt certificate
            SSL_CONFIG="
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
"
            log_info "Using Let's Encrypt certificate for Nginx"
        elif [ -f "/etc/ssl/alewo-callback/fullchain.pem" ]; then
            # Fallback to self-signed certificate
            SSL_CONFIG="
    ssl_certificate /etc/ssl/alewo-callback/fullchain.pem;
    ssl_certificate_key /etc/ssl/alewo-callback/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
"
            log_warning "Using self-signed certificate for Nginx"
        else
            log_error "No SSL certificate found!"
            return 1
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
    nginx -t || {
        log_error "Nginx configuration test failed"
        return 1
    }

    # Start or reload Nginx
    if systemctl is-active --quiet nginx; then
        log_info "Reloading Nginx..."
        systemctl reload nginx || {
            log_error "Failed to reload Nginx"
            return 1
        }
    else
        log_info "Starting Nginx..."
        systemctl start nginx || {
            log_error "Failed to start Nginx"
            return 1
        }
        systemctl enable nginx
    fi

    log_success "Nginx configured successfully"
    mark_step_complete "nginx_config"
}

# Setup PM2
setup_pm2() {
    skip_if_complete "pm2_setup" "PM2 process manager setup" && return 0

    log_step "Setting Up PM2 Process Manager"

    cd "$INSTALL_DIR"

    # Get Node.js installation path
    local NODE_DIR=$(dirname $(dirname $(which node 2>/dev/null || echo "/opt/node22/bin/node")))
    local PM2_BIN="$NODE_DIR/bin/pm2"

    # Stop existing process if any
    "$PM2_BIN" delete alewo-callback 2>/dev/null || true

    # Start application
    "$PM2_BIN" start server/index.js --name alewo-callback || {
        log_error "Failed to start application with PM2"
        return 1
    }

    # Save PM2 configuration
    "$PM2_BIN" save || {
        log_error "Failed to save PM2 configuration"
        return 1
    }

    # Setup PM2 startup
    log_info "Configuring PM2 to start on system boot..."
    PM2_STARTUP_CMD=$("$PM2_BIN" startup systemd -u root --hp /root 2>&1 | grep "sudo" | sed 's/\[PM2\] //')
    if [ -n "$PM2_STARTUP_CMD" ]; then
        # Extract the actual command without "sudo" prefix since we're already root
        ACTUAL_CMD=$(echo "$PM2_STARTUP_CMD" | sed 's/^sudo //')
        if [ -n "$ACTUAL_CMD" ]; then
            eval "$ACTUAL_CMD" || log_warning "PM2 startup configuration may have issues"
        fi
    else
        log_warning "Could not configure PM2 startup automatically"
    fi

    log_success "PM2 configured and application started"
    mark_step_complete "pm2_setup"
}

# Fix DNS port 53 conflicts
fix_dns_port_conflict() {
    skip_if_complete "dns_port_fix" "DNS port 53 conflict resolution" && return 0

    log_step "Checking DNS Port 53 Availability"

    # Backup systemd-resolved state for rollback
    SYSTEMD_RESOLVED_WAS_ACTIVE=false
    if systemctl is-active --quiet systemd-resolved; then
        SYSTEMD_RESOLVED_WAS_ACTIVE=true
    fi

    # Check if port 53 is in use
    if lsof -Pi :53 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :53 -sUDP -t >/dev/null 2>&1; then
        log_warning "Port 53 is already in use"

        # Check if systemd-resolved is using the port
        if systemctl is-active --quiet systemd-resolved; then
            log_info "systemd-resolved is using port 53"
            echo ""
            echo -e "${YELLOW}Options:${NC}"
            echo "  1. Disable systemd-resolved and use AlewoCallback DNS server (Recommended)"
            echo "  2. Keep systemd-resolved (DNS server will NOT work)"
            echo "  3. Cancel installation"
            echo ""
            read -p "Select option [1-3] (default: 1): " DNS_OPTION
            DNS_OPTION=${DNS_OPTION:-1}

            case $DNS_OPTION in
                1)
                    log_info "Disabling systemd-resolved to free port 53..."

                    # Backup original resolv.conf
                    if [ -L /etc/resolv.conf ]; then
                        RESOLV_CONF_BACKUP=$(readlink -f /etc/resolv.conf)
                        echo "$RESOLV_CONF_BACKUP" > /tmp/alewo-callback-resolv-backup
                    fi

                    # Stop and disable systemd-resolved
                    systemctl stop systemd-resolved
                    systemctl disable systemd-resolved

                    # Setup manual DNS resolution
                    log_info "Configuring manual DNS resolution..."
                    # Remove immutable flag if exists
                    chattr -i /etc/resolv.conf 2>/dev/null || true
                    rm -f /etc/resolv.conf
                    cat > /etc/resolv.conf <<EOF
# AlewoCallback DNS Configuration
# This file was created by AlewoCallback installer
# To restore systemd-resolved, run: sudo alewo-callback uninstall
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 208.67.222.222
EOF

                    # Make it immutable to prevent systemd from overwriting
                    chattr +i /etc/resolv.conf

                    # Verify DNS resolution works
                    if ! nslookup google.com 8.8.8.8 >/dev/null 2>&1; then
                        log_error "DNS resolution test failed!"
                        log_warning "Rolling back changes..."
                        rollback_dns_changes
                        return 1
                    fi

                    log_success "systemd-resolved disabled, port 53 is now available"
                    log_success "DNS resolution verified working"
                    ;;
                2)
                    log_warning "Keeping systemd-resolved - DNS server will NOT work!"
                    log_warning "AlewoCallback will function without DNS server (HTTP only)"
                    ;;
                3)
                    log_error "Installation cancelled by user"
                    exit 1
                    ;;
                *)
                    log_error "Invalid option"
                    return 1
                    ;;
            esac
        else
            log_warning "Port 53 is in use by another service (not systemd-resolved)"
            log_info "Identifying the process..."
            BLOCKING_PROCESS=$(lsof -Pi :53 -sTCP:LISTEN -t 2>/dev/null || lsof -Pi :53 -sUDP -t 2>/dev/null | head -n1)
            if [ -n "$BLOCKING_PROCESS" ]; then
                PROCESS_NAME=$(ps -p "$BLOCKING_PROCESS" -o comm= 2>/dev/null)
                log_warning "Process blocking port 53: $PROCESS_NAME (PID: $BLOCKING_PROCESS)"
                echo ""
                echo -e "${YELLOW}You need to stop this process to use the DNS server.${NC}"
                if confirm "Do you want to continue without DNS server? (HTTP only)"; then
                    log_info "Continuing without DNS server"
                else
                    log_error "Installation cancelled"
                    exit 1
                fi
            else
                log_warning "Could not identify blocking process"
                log_info "Continuing anyway - DNS server may fail to start"
            fi
        fi
    else
        log_success "Port 53 is available"
    fi

    mark_step_complete "dns_port_fix"
}

# Rollback DNS changes if something goes wrong
rollback_dns_changes() {
    log_info "Rolling back DNS configuration changes..."

    # Remove immutable flag
    chattr -i /etc/resolv.conf 2>/dev/null || true

    # Restore systemd-resolved if it was active before
    if [ "$SYSTEMD_RESOLVED_WAS_ACTIVE" = true ]; then
        log_info "  Restoring systemd-resolved..."
        systemctl enable systemd-resolved 2>/dev/null || true
        systemctl start systemd-resolved 2>/dev/null || true

        # Restore original resolv.conf
        rm -f /etc/resolv.conf
        if [ -f /tmp/alewo-callback-resolv-backup ]; then
            ORIGINAL_RESOLV=$(cat /tmp/alewo-callback-resolv-backup)
            ln -sf "$ORIGINAL_RESOLV" /etc/resolv.conf 2>/dev/null || true
            rm -f /tmp/alewo-callback-resolv-backup
        else
            ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf 2>/dev/null || true
        fi

        log_success "systemd-resolved restored"
    else
        log_info "  systemd-resolved was not active before, skipping restore"
    fi

    log_success "DNS configuration rollback completed"
}

# Setup firewall
setup_firewall() {
    skip_if_complete "firewall" "Firewall configuration" && return 0

    log_step "Configuring Firewall"

    if command -v ufw &> /dev/null; then
        # Allow SSH
        ufw allow 22/tcp

        # Allow HTTP and HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp

        # Allow DNS
        ufw allow 53/udp

        # Enable firewall
        echo "y" | ufw enable

        log_success "Firewall configured"
    else
        log_warning "UFW not installed, skipping firewall configuration"
    fi

    mark_step_complete "firewall"
}

# Create management scripts
create_management_scripts() {
    skip_if_complete "management_scripts" "Management command installation" && return 0

    log_step "Installing Management Command"

    # Copy alewo-callback command to /usr/local/bin/
    if [ -f "$INSTALL_DIR/alewo-callback" ]; then
        cp "$INSTALL_DIR/alewo-callback" /usr/local/bin/alewo-callback || {
            log_error "Failed to copy alewo-callback command"
            return 1
        }
        chmod +x /usr/local/bin/alewo-callback
        log_success "alewo-callback command installed to /usr/local/bin/"
    else
        log_error "alewo-callback command file not found in $INSTALL_DIR"
        return 1
    fi

    # Verify installation
    if command -v alewo-callback &> /dev/null; then
        log_success "Command 'alewo-callback' is now available globally"
    else
        log_error "Failed to install alewo-callback command"
        return 1
    fi

    mark_step_complete "management_scripts"
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
    echo -e "  ${GREEN}sudo alewo-callback start${NC}      - Start all services (HTTP, DNS)"
    echo -e "  ${GREEN}sudo alewo-callback stop${NC}       - Stop all services"
    echo -e "  ${GREEN}sudo alewo-callback restart${NC}    - Restart all services"
    echo -e "  ${GREEN}alewo-callback status${NC}          - Check service status"
    echo -e "  ${GREEN}alewo-callback logs${NC}            - View service logs"
    echo -e "  ${GREEN}alewo-callback logs -f${NC}         - Follow logs in real-time"
    echo -e "  ${GREEN}alewo-callback help${NC}            - Show all available commands"
    echo ""
    echo -e "${CYAN}Important Files:${NC}"
    echo -e "  ${YELLOW}Installation Directory:${NC} $INSTALL_DIR"
    echo -e "  ${YELLOW}Environment Config:${NC} $INSTALL_DIR/.env"
    echo -e "  ${YELLOW}Nginx Config:${NC} /etc/nginx/sites-available/alewo-callback"
    echo ""

    if [ "$USE_SSL" = true ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo -e "${YELLOW}SSL Certificate Information:${NC}"
        echo -e "  Certificate expires in 90 days"
        echo -e "  Manual DNS challenge requires manual renewal"
        echo -e "  ${CYAN}To renew, run:${NC}"
        echo -e "    sudo certbot certonly --manual --preferred-challenges dns \\"
        echo -e "      -d $DOMAIN -d *.$DOMAIN --force-renewal"
        echo ""
    elif [ "$USE_SSL" = false ] && [ "$DOMAIN" != "$PUBLIC_IP" ]; then
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
        echo -e "  ${YELLOW}Note:${NC} Random subdomains: 10 minutes expiry"
        echo -e "  ${YELLOW}Note:${NC} Custom subdomains: 1 minute - 7 days (user-defined)"
        echo -e "  ${YELLOW}Note:${NC} IP Geolocation enabled for all requests"
        echo ""
    fi

    echo -e "${CYAN}Key Features Installed:${NC}"
    echo -e "  ✅ DNS Server (Port 53) - Captures A, AAAA, TXT, MX, CNAME, NS queries"
    echo -e "  ✅ HTTP/HTTPS Server - All methods with full request capture"
    echo -e "  ✅ IP Geolocation - Automatic location detection (Country, City, Coordinates)"
    echo -e "  ✅ Real-time Updates - WebSocket notifications"
    echo -e "  ✅ Auto-Expiring - Random (10min), Custom (1min-7days), Scripts (5min)"
    echo -e "  ✅ Export - JSON/CSV with geolocation data"
    echo -e "  ✅ Script Generator - Shell, Backdoor, CMD, Web, SQL templates"
    echo ""
    echo -e "${CYAN}Security Recommendations:${NC}"
    echo -e "  1. Change the JWT secret in .env file"
    echo -e "  2. Setup regular database backups"
    echo -e "  3. Keep system packages updated"
    echo -e "  4. Monitor application logs regularly"
    echo -e "  5. Use firewall to restrict access if needed"
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

    # Collect configuration (skip if resuming and already collected)
    if ! is_step_complete "configuration"; then
        collect_configuration
        mark_step_complete "configuration"
    else
        log_info "Using previous configuration"
        # Load configuration from previous run
        if [ -f "/tmp/alewo-callback-config" ]; then
            source /tmp/alewo-callback-config
        fi
    fi

    # Save configuration for resume capability
    cat > /tmp/alewo-callback-config <<EOFCONFIG
DOMAIN="$DOMAIN"
USE_SSL=$USE_SSL
APP_PORT=$APP_PORT
MONGODB_URI="$MONGODB_URI"
ADMIN_USERNAME="$ADMIN_USERNAME"
ADMIN_EMAIL="$ADMIN_EMAIL"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
JWT_SECRET="$JWT_SECRET"
FILE_CLEANUP_TIME=$FILE_CLEANUP_TIME
PUBLIC_IP="$PUBLIC_IP"
INSTALL_DIR="/var/www/alewo-callback"
EOFCONFIG

    # Update system
    if ! is_step_complete "system_update"; then
        log_step "Updating System Packages"
        apt-get update || log_warning "apt-get update had some warnings"
        apt-get upgrade -y || log_warning "apt-get upgrade had some warnings"
        mark_step_complete "system_update"
    else
        log_info "Skipping system update (already completed)"
    fi

    # Install prerequisites
    if ! is_step_complete "prerequisites"; then
        log_step "Installing Prerequisites"
        apt-get install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https software-properties-common lsof || {
            log_error "Failed to install prerequisites"
            log_info "Run the script again to retry from this step"
            exit 1
        }
        mark_step_complete "prerequisites"
    else
        log_info "Skipping prerequisites (already completed)"
    fi

    # Install Node.js
    install_nodejs || {
        log_error "Node.js installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Install MongoDB
    install_mongodb || {
        log_error "MongoDB installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Install Nginx
    install_nginx || {
        log_error "Nginx installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Install Certbot
    if [ "$USE_SSL" = true ]; then
        install_certbot || {
            log_warning "Certbot installation failed - continuing without SSL"
            USE_SSL=false
        }
    fi

    # Install PM2
    install_pm2 || {
        log_error "PM2 installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Setup application
    setup_application || {
        log_error "Application setup failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Install dependencies
    install_dependencies || {
        log_error "Dependencies installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Create admin user
    create_admin_user || {
        log_error "Admin user creation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Setup SSL
    setup_ssl || {
        log_warning "SSL setup had issues - continuing"
    }

    # Configure Nginx
    configure_nginx || {
        log_error "Nginx configuration failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Fix DNS port 53 conflicts (before starting application)
    fix_dns_port_conflict || {
        log_warning "DNS port conflict resolution had issues - continuing"
    }

    # Setup PM2
    setup_pm2 || {
        log_error "PM2 setup failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Setup firewall
    setup_firewall || {
        log_warning "Firewall setup had issues - continuing"
    }

    # Create management scripts
    create_management_scripts || {
        log_error "Management scripts installation failed - exiting"
        log_info "Run the script again to retry from this step"
        exit 1
    }

    # Test installation
    test_installation

    # Show completion message
    show_completion

    # Clear state file on successful completion
    clear_state

    # Clean up temporary config
    rm -f /tmp/alewo-callback-config
}

# Run main installation
main
