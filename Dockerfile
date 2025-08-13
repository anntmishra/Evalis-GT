# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package.json and package-lock.json (if available)
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install --production && npm cache clean --force

# Copy server code
COPY server/ ./server/

# Copy frontend build (you'll need to build this first)
COPY dist/ ./dist/

# Create uploads directory with proper permissions
RUN mkdir -p /app/server/uploads && \
    mkdir -p /app/server/logs && \
    chown -R nextjs:nodejs /app/server/uploads && \
    chown -R nextjs:nodejs /app/server/logs && \
    chmod 755 /app/server/uploads && \
    chmod 755 /app/server/logs

# Copy environment file template
COPY .env.example ./.env.example

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start the application
CMD ["node", "server/server.js"]
