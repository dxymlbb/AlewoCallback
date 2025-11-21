#!/bin/bash

#######################################
# AlewoCallback - Advanced Stop Script
# Graceful shutdown with PID management
#######################################

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

# PID Files
HTTP_PID_FILE="$PID_DIR/http.pid"
DNS_PID_FILE="$PID_DIR/dns.pid"
MONGO_PID_FILE="$PID_DIR/mongo.pid"

# Log file
STOP_LOG="$LOG_DIR/stop.log"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$STOP_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$STOP_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$STOP_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$STOP_LOG"
}

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║              ALEWO CALLBACK - STOPPING                   ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Check if process is running
is_running() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Stop process gracefully
stop_process() {
    local pid=$1
    local name=$2
    local max_wait=10

    if ! is_running "$pid"; then
        log_warning "$name (PID: $pid) is not running"
        return 0
    fi

    log_info "Stopping $name (PID: $pid)..."

    # Send SIGTERM
    kill -TERM "$pid" 2>/dev/null

    # Wait for graceful shutdown
    local count=0
    while is_running "$pid" && [ $count -lt $max_wait ]; do
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""

    if is_running "$pid"; then
        log_warning "$name did not stop gracefully, forcing..."
        kill -KILL "$pid" 2>/dev/null
        sleep 1

        if is_running "$pid"; then
            log_error "Failed to stop $name (PID: $pid)"
            return 1
        fi
    fi

    log_success "$name stopped successfully"
    return 0
}

# Stop all Node.js processes related to AlewoCallback
stop_node_processes() {
    local found=false

    # Find Node.js processes running our server
    for pid in $(pgrep -f "node.*server/index.js"); do
        found=true
        stop_process "$pid" "Node.js server"
    done

    if [ "$found" = false ]; then
        log_info "No Node.js server processes found"
    fi
}

# Stop HTTP server
stop_http_server() {
    if [ -f "$HTTP_PID_FILE" ]; then
        local pid=$(cat "$HTTP_PID_FILE")
        stop_process "$pid" "HTTP server"
        rm -f "$HTTP_PID_FILE"
    else
        log_info "HTTP server PID file not found"
        # Try to find and stop anyway
        stop_node_processes
    fi
}

# Stop DNS server
stop_dns_server() {
    if [ -f "$DNS_PID_FILE" ]; then
        local pid=$(cat "$DNS_PID_FILE")
        # DNS server is integrated with HTTP server, so it's already stopped
        rm -f "$DNS_PID_FILE"
        log_info "DNS server stopped (integrated with HTTP server)"
    else
        log_info "DNS server PID file not found"
    fi
}

# Stop MongoDB (optional)
stop_mongodb() {
    if [ -f "$MONGO_PID_FILE" ]; then
        local pid=$(cat "$MONGO_PID_FILE")

        read -p "$(echo -e ${YELLOW}Stop MongoDB? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if is_running "$pid"; then
                stop_process "$pid" "MongoDB"
            else
                # Try using systemctl
                if command -v systemctl &> /dev/null; then
                    systemctl stop mongod 2>/dev/null && log_success "MongoDB stopped via systemctl"
                fi
            fi
        else
            log_info "Keeping MongoDB running"
        fi

        rm -f "$MONGO_PID_FILE"
    else
        log_info "MongoDB PID file not found (not started by this script)"
    fi
}

# Clean up PID files
cleanup_pid_files() {
    log_info "Cleaning up PID files..."

    # Remove all PID files
    rm -f "$HTTP_PID_FILE"
    rm -f "$DNS_PID_FILE"

    # Only remove mongo PID if it's not running
    if [ -f "$MONGO_PID_FILE" ]; then
        local pid=$(cat "$MONGO_PID_FILE")
        if ! is_running "$pid"; then
            rm -f "$MONGO_PID_FILE"
        fi
    fi

    log_success "PID files cleaned up"
}

# Verify all stopped
verify_stopped() {
    log_info "Verifying all services stopped..."

    local all_stopped=true

    # Check for any remaining Node.js processes
    if pgrep -f "node.*server/index.js" > /dev/null; then
        log_warning "Some Node.js processes still running"
        all_stopped=false
    fi

    # Check for port usage
    local http_port=${PORT:-3000}
    local dns_port=${DNS_PORT:-53}

    if lsof -i :$http_port > /dev/null 2>&1; then
        log_warning "Port $http_port still in use"
        all_stopped=false
    fi

    if lsof -i :$dns_port > /dev/null 2>&1; then
        log_warning "Port $dns_port still in use"
        all_stopped=false
    fi

    if [ "$all_stopped" = true ]; then
        log_success "All services stopped successfully"
    else
        log_warning "Some processes may still be running"
        echo ""
        log_info "To force kill all Node.js processes:"
        echo -e "  ${YELLOW}pkill -9 -f 'node.*server/index.js'${NC}"
    fi
}

# Show final status
show_status() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    FINAL STATUS                          ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check Node.js
    if pgrep -f "node.*server/index.js" > /dev/null; then
        echo -e "${YELLOW}○${NC} Node.js:  Some processes still running"
    else
        echo -e "${GREEN}✓${NC} Node.js:  All processes stopped"
    fi

    # Check MongoDB
    if pgrep -x mongod > /dev/null; then
        echo -e "${GREEN}✓${NC} MongoDB:  Running (not stopped)"
    else
        echo -e "${BLUE}○${NC} MongoDB:  Stopped"
    fi

    # Check ports
    local http_port=${PORT:-3000}
    if lsof -i :$http_port > /dev/null 2>&1; then
        echo -e "${YELLOW}○${NC} Port $http_port:  Still in use"
    else
        echo -e "${GREEN}✓${NC} Port $http_port:  Free"
    fi

    echo ""
}

# Force stop all
force_stop() {
    log_warning "Force stopping all AlewoCallback processes..."

    # Kill all Node.js processes
    pkill -9 -f "node.*server/index.js" 2>/dev/null && log_success "Killed all Node.js processes"

    # Clean up PID files
    cleanup_pid_files

    log_success "Force stop complete"
}

# Main execution
main() {
    show_banner

    # Check if force stop requested
    if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
        force_stop
        show_status
        exit 0
    fi

    # Create log directory if not exists
    mkdir -p "$LOG_DIR"

    # Stop services in order
    log_info "Stopping AlewoCallback services..."
    echo ""

    stop_http_server
    stop_dns_server
    stop_mongodb

    # Cleanup
    cleanup_pid_files

    # Verify
    echo ""
    verify_stopped

    # Show status
    show_status

    log_success "AlewoCallback stopped"

    echo -e "${CYAN}Tip:${NC} Use 'bash stop.sh --force' to force kill all processes"
    echo ""
}

# Run main
main "$@"
