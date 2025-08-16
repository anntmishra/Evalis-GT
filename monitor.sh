#!/bin/bash

# Evalis-GT System Monitor
# Real-time monitoring script for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to clear screen
clear_screen() {
    clear
}

# Function to print header
print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║               Evalis-GT System Monitor                     ║${NC}"
    echo -e "${CYAN}║                 $(date +'%Y-%m-%d %H:%M:%S')                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check application status
check_app_status() {
    echo -e "${BLUE}📱 APPLICATION STATUS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if app is responding
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "🟢 Application: ${GREEN}RUNNING${NC}"
        
        # Get detailed health info
        health_info=$(curl -s http://localhost:3001/api/health/detailed 2>/dev/null || echo "{}")
        if [[ "$health_info" != "{}" ]]; then
            uptime=$(echo "$health_info" | jq -r '.uptimeFormatted // "N/A"' 2>/dev/null || echo "N/A")
            requests=$(echo "$health_info" | jq -r '.details.requests // "N/A"' 2>/dev/null || echo "N/A")
            errors=$(echo "$health_info" | jq -r '.details.errors // "N/A"' 2>/dev/null || echo "N/A")
            memory=$(echo "$health_info" | jq -r '.details.memory.used // "N/A"' 2>/dev/null || echo "N/A")
            
            echo -e "⏱️  Uptime: ${CYAN}$uptime${NC}"
            echo -e "📊 Requests: ${CYAN}$requests${NC}"
            echo -e "❌ Errors: ${CYAN}$errors${NC}"
            echo -e "💾 Memory: ${CYAN}$memory${NC}"
        fi
    else
        echo -e "🔴 Application: ${RED}NOT RESPONDING${NC}"
    fi
    echo ""
}

# Function to check PM2 status
check_pm2_status() {
    echo -e "${PURPLE}🔧 PM2 PROCESS MANAGER${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q evalis-gt; then
            pm2 list | grep evalis-gt | while read line; do
                echo "📋 $line"
            done
            
            # Get PM2 monitoring info
            pm2_info=$(pm2 show evalis-gt 2>/dev/null || echo "")
            if [[ "$pm2_info" != "" ]]; then
                cpu=$(echo "$pm2_info" | grep "cpu:" | head -1 | awk '{print $2}' || echo "N/A")
                memory=$(echo "$pm2_info" | grep "memory:" | head -1 | awk '{print $2}' || echo "N/A")
                echo -e "💻 CPU Usage: ${CYAN}$cpu${NC}"
                echo -e "🧠 Memory Usage: ${CYAN}$memory${NC}"
            fi
        else
            echo -e "🔴 PM2: ${RED}No evalis-gt process found${NC}"
        fi
    else
        echo -e "🔴 PM2: ${RED}Not installed${NC}"
    fi
    echo ""
}

# Function to check Docker status
check_docker_status() {
    echo -e "${BLUE}🐳 DOCKER CONTAINERS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if command -v docker &> /dev/null; then
        if docker-compose ps 2>/dev/null | grep -q Up; then
            docker-compose ps | tail -n +3 | while read line; do
                if [[ "$line" != "" ]]; then
                    echo "🐳 $line"
                fi
            done
        else
            echo -e "🔴 Docker: ${RED}No containers running${NC}"
        fi
    else
        echo -e "🔴 Docker: ${RED}Not installed${NC}"
    fi
    echo ""
}

# Function to check database status
check_database_status() {
    echo -e "${GREEN}🗄️  DATABASE STATUS${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if curl -f -s http://localhost:3001/api/ready > /dev/null 2>&1; then
        echo -e "🟢 Database: ${GREEN}CONNECTED${NC}"
        
        # Get database health info
        db_info=$(curl -s http://localhost:3001/api/health/detailed 2>/dev/null || echo "{}")
        if [[ "$db_info" != "{}" ]]; then
            db_status=$(echo "$db_info" | jq -r '.database.status // "unknown"' 2>/dev/null || echo "unknown")
            last_check=$(echo "$db_info" | jq -r '.database.timestamp // "N/A"' 2>/dev/null || echo "N/A")
            
            echo -e "📊 Status: ${CYAN}$db_status${NC}"
            echo -e "🕐 Last Check: ${CYAN}$last_check${NC}"
        fi
    else
        echo -e "🔴 Database: ${RED}NOT CONNECTED${NC}"
    fi
    echo ""
}

# Function to check system resources
check_system_resources() {
    echo -e "${YELLOW}💻 SYSTEM RESOURCES${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # CPU Usage
    if command -v top &> /dev/null; then
        cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "N/A")
        echo -e "🖥️  CPU Usage: ${CYAN}$cpu_usage%${NC}"
    fi
    
    # Memory Usage
    if command -v vm_stat &> /dev/null; then
        memory_info=$(vm_stat | head -4)
        free_pages=$(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        inactive_pages=$(echo "$memory_info" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
        if [[ "$free_pages" != "" && "$inactive_pages" != "" ]]; then
            free_mb=$(((free_pages + inactive_pages) * 4096 / 1024 / 1024))
            echo -e "🧠 Free Memory: ${CYAN}${free_mb}MB${NC}"
        fi
    fi
    
    # Disk Usage
    if command -v df &> /dev/null; then
        disk_usage=$(df -h / | tail -1 | awk '{print $5}' 2>/dev/null || echo "N/A")
        disk_free=$(df -h / | tail -1 | awk '{print $4}' 2>/dev/null || echo "N/A")
        echo -e "💾 Disk Usage: ${CYAN}$disk_usage${NC}"
        echo -e "💽 Disk Free: ${CYAN}$disk_free${NC}"
    fi
    
    # Load Average
    if command -v uptime &> /dev/null; then
        load_avg=$(uptime | awk -F'load averages:' '{print $2}' | xargs 2>/dev/null || echo "N/A")
        echo -e "⚖️  Load Average: ${CYAN}$load_avg${NC}"
    fi
    echo ""
}

# Function to check logs
check_recent_logs() {
    echo -e "${RED}📋 RECENT LOGS${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check PM2 logs
    if command -v pm2 &> /dev/null && pm2 list | grep -q evalis-gt; then
        echo -e "${CYAN}PM2 Logs (last 5 lines):${NC}"
        pm2 logs evalis-gt --lines 5 --nostream 2>/dev/null | tail -5 || echo "No PM2 logs available"
        echo ""
    fi
    
    # Check application logs
    log_dir="/Users/anantmishra/Documents/GitHub/Evalis-GT/server/logs"
    if [ -d "$log_dir" ]; then
        echo -e "${CYAN}Application Logs (last 5 lines):${NC}"
        find "$log_dir" -name "*.log" -type f -exec tail -5 {} \; 2>/dev/null | tail -5 || echo "No application logs available"
    fi
    echo ""
}

# Function to monitor in real-time
monitor_realtime() {
    while true; do
        clear_screen
        print_header
        check_app_status
        check_pm2_status
        check_docker_status
        check_database_status
        check_system_resources
        check_recent_logs
        
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}Press Ctrl+C to exit | Refreshing every 5 seconds...${NC}"
        
        sleep 5
    done
}

# Function to show summary
show_summary() {
    clear_screen
    print_header
    check_app_status
    check_pm2_status
    check_docker_status
    check_database_status
    check_system_resources
}

# Main script logic
case "$1" in
    "monitor"|"")
        monitor_realtime
        ;;
    "summary")
        show_summary
        ;;
    "status")
        show_summary
        ;;
    "logs")
        check_recent_logs
        ;;
    *)
        echo "Usage: $0 {monitor|summary|status|logs}"
        echo ""
        echo "Commands:"
        echo "  monitor   - Real-time monitoring (default)"
        echo "  summary   - One-time status summary"
        echo "  status    - Same as summary"
        echo "  logs      - Show recent logs"
        exit 1
        ;;
esac
