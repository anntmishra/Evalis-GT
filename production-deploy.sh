#!/bin/bash

# Evalis-GT Production Deployment Script
# This script sets up a robust production environment with persistent database connections

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="evalis-gt"
APP_DIR="/Users/anantmishra/Documents/GitHub/Evalis-GT"
LOG_DIR="$APP_DIR/server/logs"
PID_FILE="$APP_DIR/evalis.pid"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Function to check if application is running
check_app_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    else
        return 1  # Not running
    fi
}

# Function to stop the application gracefully
stop_app() {
    log "Stopping Evalis-GT application..."
    
    # Stop PM2 process if running
    if command -v pm2 &> /dev/null; then
        pm2 stop evalis-gt 2>/dev/null || true
        pm2 delete evalis-gt 2>/dev/null || true
    fi
    
    # Stop Docker containers if running
    if [ -f "$APP_DIR/docker-compose.yml" ]; then
        cd "$APP_DIR"
        docker-compose down 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 5
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    log "Application stopped successfully"
}

# Function to prepare the environment
prepare_environment() {
    log "Preparing production environment..."
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR/server/uploads"
    
    # Set proper permissions
    chmod 755 "$APP_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$APP_DIR/server/uploads"
    
    # Ensure .env file exists
    if [ ! -f "$APP_DIR/.env" ]; then
        log_error ".env file not found. Please create it with your production configuration."
        exit 1
    fi
    
    # Set NODE_ENV to production
    export NODE_ENV=production
    
    log "Environment prepared successfully"
}

# Function to install dependencies
install_dependencies() {
    log "Installing production dependencies..."
    
    cd "$APP_DIR"
    
    # Install root dependencies
    npm ci --production --silent
    
    # Install server dependencies
    cd server
    npm ci --production --silent
    
    cd "$APP_DIR"
    log "Dependencies installed successfully"
}

# Function to build the application
build_application() {
    log "Building application for production..."
    
    cd "$APP_DIR"
    
    # Build frontend
    npm run build
    
    log "Application built successfully"
}

# Function to test database connection
test_database() {
    log "Testing database connection..."
    
    cd "$APP_DIR"
    
    # Test database connection
    if npm run test:db; then
        log "Database connection successful"
    else
        log_error "Database connection failed. Please check your DATABASE_URL in .env"
        exit 1
    fi
}

# Function to setup database if needed
setup_database() {
    log "Setting up database if needed..."
    
    cd "$APP_DIR"
    
    # Create admin if it doesn't exist
    npm run create:admin 2>/dev/null || log_warning "Admin might already exist"
    
    log "Database setup completed"
}

# Function to start with PM2 (recommended for production)
start_with_pm2() {
    log "Starting application with PM2..."
    
    cd "$APP_DIR"
    
    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2
    fi
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup || log_warning "Could not setup PM2 startup script (might need sudo)"
    
    log "Application started with PM2"
}

# Function to start with Docker (alternative)
start_with_docker() {
    log "Starting application with Docker..."
    
    cd "$APP_DIR"
    
    # Build and start with docker-compose
    docker-compose up -d --build
    
    log "Application started with Docker"
}

# Function to start manually (fallback)
start_manually() {
    log "Starting application manually..."
    
    cd "$APP_DIR"
    
    # Start the server in background
    nohup npm run server:prod > "$LOG_DIR/app.log" 2>&1 &
    echo $! > "$PID_FILE"
    
    log "Application started manually (PID: $(cat $PID_FILE))"
}

# Function to check application health
check_health() {
    log "Checking application health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            log "Application is healthy and responding"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Application failed health checks after $max_attempts attempts"
    return 1
}

# Function to show status
show_status() {
    log "=== Evalis-GT Application Status ==="
    
    # Check PM2 status
    if command -v pm2 &> /dev/null; then
        echo -e "\n${BLUE}PM2 Status:${NC}"
        pm2 list 2>/dev/null || echo "PM2 not running or no processes"
    fi
    
    # Check Docker status
    if command -v docker &> /dev/null; then
        echo -e "\n${BLUE}Docker Status:${NC}"
        docker-compose ps 2>/dev/null || echo "Docker Compose not running"
    fi
    
    # Check manual process
    if check_app_status; then
        echo -e "\n${GREEN}Manual Process: Running (PID: $(cat $PID_FILE))${NC}"
    else
        echo -e "\n${RED}Manual Process: Not running${NC}"
    fi
    
    # Check application health
    echo -e "\n${BLUE}Application Health:${NC}"
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application is responding${NC}"
    else
        echo -e "${RED}✗ Application is not responding${NC}"
    fi
    
    # Check database
    echo -e "\n${BLUE}Database Status:${NC}"
    cd "$APP_DIR"
    if npm run test:db > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
    fi
}

# Function to show logs
show_logs() {
    log "=== Application Logs ==="
    
    # Show PM2 logs if available
    if command -v pm2 &> /dev/null && pm2 list | grep -q evalis-gt; then
        echo -e "\n${BLUE}PM2 Logs (last 50 lines):${NC}"
        pm2 logs evalis-gt --lines 50 --nostream
    fi
    
    # Show Docker logs if available
    if [ -f "$APP_DIR/docker-compose.yml" ] && docker-compose ps | grep -q Up; then
        echo -e "\n${BLUE}Docker Logs (last 50 lines):${NC}"
        cd "$APP_DIR"
        docker-compose logs --tail=50 app
    fi
    
    # Show manual logs if available
    if [ -f "$LOG_DIR/app.log" ]; then
        echo -e "\n${BLUE}Manual Process Logs (last 50 lines):${NC}"
        tail -50 "$LOG_DIR/app.log"
    fi
}

# Function to restart application
restart_app() {
    log "Restarting Evalis-GT application..."
    
    stop_app
    sleep 2
    
    # Determine best deployment method and start
    if command -v pm2 &> /dev/null; then
        start_with_pm2
    elif command -v docker &> /dev/null && [ -f "$APP_DIR/docker-compose.yml" ]; then
        start_with_docker
    else
        start_manually
    fi
    
    # Check health after restart
    if check_health; then
        log "Application restarted successfully"
    else
        log_error "Application restart failed health check"
        exit 1
    fi
}

# Function to deploy application
deploy_app() {
    log "=== Starting Evalis-GT Production Deployment ==="
    
    # Stop existing application
    stop_app
    
    # Prepare environment
    prepare_environment
    
    # Install dependencies
    install_dependencies
    
    # Build application
    build_application
    
    # Test database
    test_database
    
    # Setup database
    setup_database
    
    # Start application (prefer PM2, fallback to Docker, then manual)
    if command -v pm2 &> /dev/null; then
        log "Using PM2 for process management"
        start_with_pm2
    elif command -v docker &> /dev/null && [ -f "$APP_DIR/docker-compose.yml" ]; then
        log "Using Docker for deployment"
        start_with_docker
    else
        log "Using manual startup"
        start_manually
    fi
    
    # Check health
    if check_health; then
        log "=== Deployment completed successfully! ==="
        log "Application is running at: http://localhost:3001"
        log "Health endpoint: http://localhost:3001/api/health"
        log "Admin panel: http://localhost:3001/admin"
    else
        log_error "=== Deployment failed health check ==="
        exit 1
    fi
}

# Main script logic
case "$1" in
    "deploy")
        deploy_app
        ;;
    "start")
        if command -v pm2 &> /dev/null; then
            start_with_pm2
        elif command -v docker &> /dev/null && [ -f "$APP_DIR/docker-compose.yml" ]; then
            start_with_docker
        else
            start_manually
        fi
        check_health
        ;;
    "stop")
        stop_app
        ;;
    "restart")
        restart_app
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "health")
        check_health
        ;;
    *)
        echo "Usage: $0 {deploy|start|stop|restart|status|logs|health}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (stop, build, start)"
        echo "  start    - Start the application"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  status   - Show application status"
        echo "  logs     - Show application logs"
        echo "  health   - Check application health"
        exit 1
        ;;
esac
