#!/bin/bash

#######################################
# AlewoCallback - Advanced Start Script
# Handles DNS + HTTP servers with PID management
#######################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/logs"
LOCK_FILE="$SCRIPT_DIR/.lock"

# PID Files
HTTP_PID_FILE="$PID_DIR/http.pid"
DNS_PID_FILE="$PID_DIR/dns.pid"
MONGO_PID_FILE="$PID_DIR/mongo.pid"

# Log Files
HTTP_LOG="$LOG_DIR/http.log"
DNS_LOG="$LOG_DIR/dns.log"
ERROR_LOG="$LOG_DIR/error.log"
STARTUP_LOG="$LOG_DIR/startup.log"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

# Default values
HTTP_PORT=${PORT:-3000}
DNS_PORT=${DNS_PORT:-53}
NODE_ENV=${NODE_ENV:-production}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$STARTUP_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$STARTUP_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$ERROR_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$STARTUP_LOG"
}

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║              ALEWO CALLBACK - STARTING                   ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Create necessary directories
setup_directories() {
    mkdir -p "$PID_DIR"
    mkdir -p "$LOG_DIR"
    chmod 755 "$PID_DIR"
    chmod 755 "$LOG_DIR"
}

# Check if process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is dead
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Check for lock file
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local lock_pid=$(cat "$LOCK_FILE")
        if ps -p "$lock_pid" > /dev/null 2>&1; then
            log_error "Another instance is already starting (PID: $lock_pid)"
            log_error "If this is an error, remove: $LOCK_FILE"
            exit 1
        else
            log_warning "Stale lock file found, removing..."
            rm -f "$LOCK_FILE"
        fi
    fi

    # Create lock file
    echo $$ > "$LOCK_FILE"
}

# Remove lock file
remove_lock() {
    rm -f "$LOCK_FILE"
}

# Check if already running
check_already_running() {
    local running=false

    if is_running "$HTTP_PID_FILE"; then
        log_warning "HTTP server already running (PID: $(cat $HTTP_PID_FILE))"
        running=true
    fi

    if is_running "$DNS_PID_FILE"; then
        log_warning "DNS server already running (PID: $(cat $DNS_PID_FILE))"
        running=true
    fi

    if [ "$running" = true ]; then
        echo ""
        read -p "$(echo -e ${YELLOW}Stop existing processes and restart? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Stopping existing processes..."
            bash "$SCRIPT_DIR/stop.sh"
            sleep 2
        else
            log_info "Exiting..."
            remove_lock
            exit 0
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        remove_lock
        exit 1
    fi

    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher (current: $(node --version))"
        remove_lock
        exit 1
    fi

    log_success "Node.js version: $(node --version)"

    # Check if we need sudo for DNS (port 53)
    if [ "$DNS_PORT" -eq 53 ] && [ "$EUID" -ne 0 ]; then
        log_error "DNS server requires root privileges for port 53"
        log_error "Please run with: sudo bash start.sh"
        remove_lock
        exit 1
    fi

    # Check MongoDB
    if ! pgrep -x mongod > /dev/null; then
        log_warning "MongoDB not running, attempting to start..."
        start_mongodb
    else
        log_success "MongoDB is running"
    fi

    # Check required files
    if [ ! -f "$SCRIPT_DIR/server/index.js" ]; then
        log_error "Server file not found: $SCRIPT_DIR/server/index.js"
        remove_lock
        exit 1
    fi

    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_warning ".env file not found, using defaults"
    fi

    # Check node_modules
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        log_error "Dependencies not installed. Run: npm install"
        remove_lock
        exit 1
    fi
}

# Start MongoDB
start_mongodb() {
    if command -v mongod &> /dev/null; then
        if ! pgrep -x mongod > /dev/null; then
            log_info "Starting MongoDB..."

            if command -v systemctl &> /dev/null; then
                systemctl start mongod 2>/dev/null || true
            else
                mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb 2>/dev/null || true
            fi

            sleep 2

            if pgrep -x mongod > /dev/null; then
                local mongo_pid=$(pgrep -x mongod)
                echo "$mongo_pid" > "$MONGO_PID_FILE"
                log_success "MongoDB started (PID: $mongo_pid)"
            else
                log_error "Failed to start MongoDB"
                remove_lock
                exit 1
            fi
        fi
    else
        log_error "MongoDB not installed"
        remove_lock
        exit 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_wait=30
    local count=0

    log_info "Waiting for $service_name to be ready..."

    while [ $count -lt $max_wait ]; do
        if eval "$check_command" &> /dev/null; then
            log_success "$service_name is ready"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done

    echo ""
    log_error "$service_name failed to start within ${max_wait}s"
    return 1
}

# Start HTTP server
start_http_server() {
    log_info "Starting HTTP server on port $HTTP_PORT..."

    cd "$SCRIPT_DIR"

    # Start server in background
    nohup node server/index.js > "$HTTP_LOG" 2>&1 &
    local pid=$!

    echo "$pid" > "$HTTP_PID_FILE"

    # Wait for server to be ready
    if wait_for_service "HTTP server" "curl -sf http://localhost:$HTTP_PORT/health"; then
        log_success "HTTP server started (PID: $pid)"
        return 0
    else
        log_error "HTTP server failed to start"
        # Check logs
        log_error "Last 10 lines of log:"
        tail -n 10 "$HTTP_LOG"

        # Kill the process
        kill "$pid" 2>/dev/null || true
        rm -f "$HTTP_PID_FILE"
        return 1
    fi
}

# Health check
health_check() {
    log_info "Running health checks..."

    local all_healthy=true

    # Check HTTP server
    if is_running "$HTTP_PID_FILE"; then
        if curl -sf "http://localhost:$HTTP_PORT/health" > /dev/null 2>&1; then
            log_success "HTTP server health check: OK"
        else
            log_error "HTTP server health check: FAILED"
            all_healthy=false
        fi
    else
        log_error "HTTP server is not running"
        all_healthy=false
    fi

    # Check DNS server (if running)
    if is_running "$DNS_PID_FILE"; then
        if lsof -i :$DNS_PORT > /dev/null 2>&1 || netstat -ulnp 2>/dev/null | grep -q ":$DNS_PORT"; then
            log_success "DNS server health check: OK"
        else
            log_warning "DNS server health check: Cannot verify"
        fi
    fi

    # Check MongoDB
    if pgrep -x mongod > /dev/null; then
        log_success "MongoDB health check: OK"
    else
        log_error "MongoDB health check: FAILED"
        all_healthy=false
    fi

    if [ "$all_healthy" = false ]; then
        log_error "Some services failed health checks"
        return 1
    fi

    return 0
}

# Show status
show_status() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    SERVICE STATUS                        ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # HTTP Server
    if is_running "$HTTP_PID_FILE"; then
        local http_pid=$(cat "$HTTP_PID_FILE")
        echo -e "${GREEN}✓${NC} HTTP Server:  Running (PID: $http_pid, Port: $HTTP_PORT)"
    else
        echo -e "${RED}✗${NC} HTTP Server:  Not running"
    fi

    # DNS Server
    if is_running "$DNS_PID_FILE"; then
        local dns_pid=$(cat "$DNS_PID_FILE")
        echo -e "${GREEN}✓${NC} DNS Server:   Running (PID: $dns_pid, Port: $DNS_PORT)"
    else
        echo -e "${YELLOW}○${NC} DNS Server:   Not running (started with HTTP server)"
    fi

    # MongoDB
    if pgrep -x mongod > /dev/null; then
        local mongo_pid=$(pgrep -x mongod)
        echo -e "${GREEN}✓${NC} MongoDB:      Running (PID: $mongo_pid)"
    else
        echo -e "${RED}✗${NC} MongoDB:      Not running"
    fi

    echo ""
    echo -e "${CYAN}Logs:${NC}"
    echo -e "  HTTP:   tail -f $HTTP_LOG"
    echo -e "  Error:  tail -f $ERROR_LOG"
    echo ""

    if [ -f "$SCRIPT_DIR/.env" ]; then
        local domain=${BASE_DOMAIN:-"callback.local"}
        local protocol="http"
        if [ "${SSL_ENABLED}" = "true" ]; then
            protocol="https"
        fi

        echo -e "${CYAN}Access:${NC}"
        echo -e "  ${GREEN}${protocol}://${domain}${NC}"
        echo ""
    fi

    echo -e "${CYAN}Commands:${NC}"
    echo -e "  Stop:    bash stop.sh"
    echo -e "  Status:  bash status.sh"
    echo -e "  Logs:    tail -f logs/http.log"
    echo ""
}

# Cleanup on exit
cleanup() {
    remove_lock
}

# Trap signals
trap cleanup EXIT INT TERM

# Main execution
main() {
    show_banner

    # Setup
    setup_directories
    check_lock

    # Pre-flight checks
    check_already_running
    check_prerequisites

    # Start services
    log_info "Starting AlewoCallback services..."
    echo ""

    if ! start_http_server; then
        log_error "Failed to start HTTP server"
        cleanup
        exit 1
    fi

    # DNS server starts automatically with HTTP server
    # Just note it in the PID file if detected
    sleep 2
    if lsof -i :$DNS_PORT > /dev/null 2>&1 || netstat -ulnp 2>/dev/null | grep -q ":$DNS_PORT"; then
        # DNS server is running (part of HTTP server process)
        log_success "DNS server detected on port $DNS_PORT"
        # Use same PID as HTTP server since DNS is integrated
        cat "$HTTP_PID_FILE" > "$DNS_PID_FILE"
    fi

    # Health check
    echo ""
    if ! health_check; then
        log_warning "Some health checks failed, but services are running"
    fi

    # Show status
    show_status

    log_success "AlewoCallback started successfully!"

    # Remove lock
    remove_lock
}

# Run main
main
