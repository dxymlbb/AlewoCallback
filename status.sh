#!/bin/bash

#######################################
# AlewoCallback - Status Check Script
# Real-time status of all services
#######################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/logs"

# PID Files
HTTP_PID_FILE="$PID_DIR/http.pid"
DNS_PID_FILE="$PID_DIR/dns.pid"
MONGO_PID_FILE="$PID_DIR/mongo.pid"

# Load environment
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

HTTP_PORT=${PORT:-3000}
DNS_PORT=${DNS_PORT:-53}
BASE_DOMAIN=${BASE_DOMAIN:-"callback.local"}
SSL_ENABLED=${SSL_ENABLED:-false}

# Check if process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "$pid"
            return 0
        fi
    fi
    return 1
}

# Get process uptime
get_uptime() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        ps -p "$pid" -o etime= | tr -d ' '
    else
        echo "N/A"
    fi
}

# Get process memory usage
get_memory() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        ps -p "$pid" -o rss= | awk '{printf "%.1f MB", $1/1024}'
    else
        echo "N/A"
    fi
}

# Get CPU usage
get_cpu() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        ps -p "$pid" -o %cpu= | tr -d ' ' | awk '{print $1"%"}'
    else
        echo "N/A"
    fi
}

# Check port
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Get log size
get_log_size() {
    local log_file=$1
    if [ -f "$log_file" ]; then
        du -h "$log_file" | cut -f1
    else
        echo "0B"
    fi
}

# Get log last modified
get_log_modified() {
    local log_file=$1
    if [ -f "$log_file" ]; then
        stat -c %y "$log_file" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" "$log_file" 2>/dev/null
    else
        echo "N/A"
    fi
}

# Health check endpoint
health_check() {
    if curl -sf "http://localhost:$HTTP_PORT/health" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Count interactions (if MongoDB is accessible)
count_interactions() {
    if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
        local mongo_cmd="mongosh"
        command -v mongosh &> /dev/null || mongo_cmd="mongo"

        local count=$($mongo_cmd --quiet --eval "db.getSiblingDB('alewo-callback').callbacks.countDocuments({})" 2>/dev/null)
        echo "${count:-0}"
    else
        echo "N/A"
    fi
}

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║            ALEWO CALLBACK - SYSTEM STATUS                ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Show services status
show_services() {
    echo -e "${MAGENTA}═══ SERVICES STATUS ═══${NC}"
    echo ""

    # HTTP Server
    local http_pid=$(is_running "$HTTP_PID_FILE")
    if [ $? -eq 0 ]; then
        local uptime=$(get_uptime "$http_pid")
        local memory=$(get_memory "$http_pid")
        local cpu=$(get_cpu "$http_pid")

        echo -e "${GREEN}● HTTP Server${NC}"
        echo -e "  Status:    ${GREEN}Running${NC}"
        echo -e "  PID:       $http_pid"
        echo -e "  Port:      $HTTP_PORT"
        echo -e "  Uptime:    $uptime"
        echo -e "  Memory:    $memory"
        echo -e "  CPU:       $cpu"

        if health_check; then
            echo -e "  Health:    ${GREEN}OK${NC}"
        else
            echo -e "  Health:    ${YELLOW}CHECK FAILED${NC}"
        fi
    else
        echo -e "${RED}● HTTP Server${NC}"
        echo -e "  Status:    ${RED}Not Running${NC}"
    fi

    echo ""

    # DNS Server
    if check_port "$DNS_PORT"; then
        echo -e "${GREEN}● DNS Server${NC}"
        echo -e "  Status:    ${GREEN}Running${NC}"
        echo -e "  Port:      $DNS_PORT (UDP)"

        if [ -f "$DNS_PID_FILE" ]; then
            local dns_pid=$(cat "$DNS_PID_FILE")
            echo -e "  PID:       $dns_pid"
        fi
    else
        echo -e "${RED}● DNS Server${NC}"
        echo -e "  Status:    ${RED}Not Running${NC}"
        echo -e "  Port:      $DNS_PORT"
    fi

    echo ""

    # MongoDB
    if pgrep -x mongod > /dev/null; then
        local mongo_pid=$(pgrep -x mongod)
        local uptime=$(get_uptime "$mongo_pid")
        local memory=$(get_memory "$mongo_pid")

        echo -e "${GREEN}● MongoDB${NC}"
        echo -e "  Status:    ${GREEN}Running${NC}"
        echo -e "  PID:       $mongo_pid"
        echo -e "  Uptime:    $uptime"
        echo -e "  Memory:    $memory"
    else
        echo -e "${RED}● MongoDB${NC}"
        echo -e "  Status:    ${RED}Not Running${NC}"
    fi

    echo ""
}

# Show configuration
show_config() {
    echo -e "${MAGENTA}═══ CONFIGURATION ═══${NC}"
    echo ""
    echo -e "  Environment:  ${NODE_ENV:-development}"
    echo -e "  Base Domain:  $BASE_DOMAIN"
    echo -e "  SSL Enabled:  $SSL_ENABLED"

    if [ "$SSL_ENABLED" = "true" ]; then
        echo -e "  Access URL:   ${GREEN}https://${BASE_DOMAIN}${NC}"
    else
        echo -e "  Access URL:   ${GREEN}http://${BASE_DOMAIN}${NC}"
    fi

    echo ""
}

# Show statistics
show_stats() {
    echo -e "${MAGENTA}═══ STATISTICS ═══${NC}"
    echo ""

    local callback_count=$(count_interactions)
    echo -e "  Total Callbacks:  $callback_count"

    echo ""
}

# Show logs info
show_logs() {
    echo -e "${MAGENTA}═══ LOGS ═══${NC}"
    echo ""

    local http_log="$LOG_DIR/http.log"
    local error_log="$LOG_DIR/error.log"

    if [ -f "$http_log" ]; then
        local size=$(get_log_size "$http_log")
        local modified=$(get_log_modified "$http_log")
        echo -e "  HTTP Log:    $size (modified: $modified)"
    else
        echo -e "  HTTP Log:    ${YELLOW}Not found${NC}"
    fi

    if [ -f "$error_log" ]; then
        local size=$(get_log_size "$error_log")
        local modified=$(get_log_modified "$error_log")
        echo -e "  Error Log:   $size (modified: $modified)"
    else
        echo -e "  Error Log:   ${YELLOW}Not found${NC}"
    fi

    echo ""
    echo -e "  View logs:"
    echo -e "    tail -f $http_log"
    echo -e "    tail -f $error_log"

    echo ""
}

# Show commands
show_commands() {
    echo -e "${MAGENTA}═══ COMMANDS ═══${NC}"
    echo ""
    echo -e "  Start:       ${CYAN}bash start.sh${NC}"
    echo -e "  Stop:        ${CYAN}bash stop.sh${NC}"
    echo -e "  Status:      ${CYAN}bash status.sh${NC}"
    echo -e "  Force Stop:  ${CYAN}bash stop.sh --force${NC}"
    echo ""
}

# Watch mode
watch_status() {
    while true; do
        show_banner
        show_services
        show_config
        show_stats
        show_logs
        show_commands

        echo -e "${BLUE}[Refreshing in 5s... Press Ctrl+C to exit]${NC}"
        sleep 5
    done
}

# Main execution
main() {
    if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
        watch_status
    else
        show_banner
        show_services
        show_config
        show_stats
        show_logs
        show_commands

        echo -e "${BLUE}Tip: Use 'bash status.sh --watch' for live updates${NC}"
        echo ""
    fi
}

# Run main
main "$@"
