#!/bin/bash

#######################################
# AlewoCallback - Uninstaller
# Remove all components and data
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

# Banner
show_banner() {
    clear
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║              ALEWO CALLBACK UNINSTALLER                  ║"
    echo "║                                                           ║"
    echo "║              ⚠️  THIS WILL REMOVE ALL DATA  ⚠️            ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Stop application
stop_application() {
    log_step "Stopping Application"

    if command -v pm2 &> /dev/null; then
        pm2 stop alewo-callback 2>/dev/null || true
        pm2 delete alewo-callback 2>/dev/null || true
        pm2 save --force
        log_success "Application stopped"
    else
        log_warning "PM2 not found, skipping application stop"
    fi
}

# Remove Nginx configuration
remove_nginx() {
    log_step "Removing Nginx Configuration"

    if [ -f /etc/nginx/sites-enabled/alewo-callback ]; then
        rm -f /etc/nginx/sites-enabled/alewo-callback
        log_info "Removed Nginx site configuration"
    fi

    if [ -f /etc/nginx/sites-available/alewo-callback ]; then
        rm -f /etc/nginx/sites-available/alewo-callback
        log_info "Removed Nginx configuration file"
    fi

    if command -v nginx &> /dev/null; then
        nginx -t && systemctl reload nginx
        log_success "Nginx reloaded"
    fi
}

# Remove application files
remove_application_files() {
    log_step "Removing Application Files"

    INSTALL_DIR="/var/www/alewo-callback"

    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        log_success "Application files removed"
    else
        log_warning "Application directory not found"
    fi
}

# Remove management scripts
remove_management_scripts() {
    log_step "Removing Management Scripts"

    for script in alewo-start alewo-stop alewo-restart alewo-status alewo-logs; do
        if [ -f "/usr/local/bin/$script" ]; then
            rm -f "/usr/local/bin/$script"
            log_info "Removed $script"
        fi
    done

    log_success "Management scripts removed"
}

# Remove SSL certificates
remove_ssl() {
    log_step "Removing SSL Certificates"

    if confirm "Do you want to remove SSL certificates?"; then
        if [ -d "/etc/ssl/alewo-callback" ]; then
            rm -rf /etc/ssl/alewo-callback
            log_info "Removed self-signed SSL certificates"
        fi

        if confirm "Remove Let's Encrypt certificates? (This will affect other sites using the same domain)"; then
            # Note: We don't actually remove Let's Encrypt certs as they might be used by other services
            log_warning "Let's Encrypt certificates kept for safety. Remove manually if needed:"
            log_warning "  certbot delete --cert-name <domain>"
        fi

        log_success "SSL cleanup completed"
    else
        log_info "Keeping SSL certificates"
    fi
}

# Remove database
remove_database() {
    log_step "Removing Database"

    if confirm "Do you want to remove the MongoDB database? (THIS WILL DELETE ALL DATA)"; then
        if command -v mongo &> /dev/null || command -v mongosh &> /dev/null; then
            MONGO_CMD="mongo"
            if command -v mongosh &> /dev/null; then
                MONGO_CMD="mongosh"
            fi

            $MONGO_CMD --eval "db.getSiblingDB('alewo-callback').dropDatabase()" 2>/dev/null || true
            log_success "Database removed"
        else
            log_warning "MongoDB client not found, skipping database removal"
        fi
    else
        log_info "Keeping database"
    fi
}

# Remove dependencies (optional)
remove_dependencies() {
    log_step "Removing Dependencies"

    if confirm "Do you want to remove Node.js, MongoDB, Nginx, and other dependencies?"; then
        log_warning "This will remove system packages that might be used by other applications!"

        if confirm "Are you absolutely sure?"; then
            # Stop services
            systemctl stop mongod 2>/dev/null || true
            systemctl disable mongod 2>/dev/null || true

            # Remove PM2
            if command -v pm2 &> /dev/null; then
                npm uninstall -g pm2
                log_info "Removed PM2"
            fi

            # Remove packages
            apt-get remove -y mongodb-org nginx certbot python3-certbot-nginx 2>/dev/null || true
            apt-get autoremove -y

            log_success "Dependencies removed"
        else
            log_info "Keeping dependencies"
        fi
    else
        log_info "Keeping dependencies"
    fi
}

# Remove firewall rules
remove_firewall_rules() {
    log_step "Removing Firewall Rules"

    if confirm "Do you want to remove firewall rules for HTTP/HTTPS?"; then
        if command -v ufw &> /dev/null; then
            ufw delete allow 80/tcp 2>/dev/null || true
            ufw delete allow 443/tcp 2>/dev/null || true
            log_success "Firewall rules removed"
        else
            log_warning "UFW not found, skipping firewall cleanup"
        fi
    else
        log_info "Keeping firewall rules"
    fi
}

# Create backup
create_backup() {
    log_step "Creating Backup"

    if confirm "Do you want to create a backup before uninstalling?"; then
        BACKUP_DIR="/root/alewo-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"

        # Backup application files
        if [ -d "/var/www/alewo-callback" ]; then
            cp -r /var/www/alewo-callback "$BACKUP_DIR/" 2>/dev/null || true
        fi

        # Backup MongoDB
        if command -v mongodump &> /dev/null; then
            mongodump --db alewo-callback --out "$BACKUP_DIR/mongodb" 2>/dev/null || true
        fi

        # Backup Nginx config
        if [ -f /etc/nginx/sites-available/alewo-callback ]; then
            cp /etc/nginx/sites-available/alewo-callback "$BACKUP_DIR/" 2>/dev/null || true
        fi

        log_success "Backup created at: $BACKUP_DIR"
    else
        log_info "Skipping backup"
    fi
}

# Show completion message
show_completion() {
    log_step "Uninstallation Complete"

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║        ALEWO CALLBACK HAS BEEN UNINSTALLED                ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}The following have been removed:${NC}"
    echo -e "  ✓ Application files"
    echo -e "  ✓ Nginx configuration"
    echo -e "  ✓ PM2 process"
    echo -e "  ✓ Management scripts"
    echo ""
    echo -e "${YELLOW}Thank you for using AlewoCallback!${NC}"
    echo ""
}

# Main uninstallation flow
main() {
    show_banner

    # Check if running as root
    check_root

    log_warning "This will completely remove AlewoCallback from your system!"
    echo ""

    if ! confirm "Are you sure you want to continue?"; then
        log_info "Uninstallation cancelled"
        exit 0
    fi

    # Create backup
    create_backup

    # Stop application
    stop_application

    # Remove Nginx configuration
    remove_nginx

    # Remove application files
    remove_application_files

    # Remove management scripts
    remove_management_scripts

    # Remove SSL certificates
    remove_ssl

    # Remove database
    remove_database

    # Remove dependencies
    remove_dependencies

    # Remove firewall rules
    remove_firewall_rules

    # Show completion message
    show_completion
}

# Run main uninstallation
main
