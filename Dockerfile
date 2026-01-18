# Base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run prisma:generate
RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Install OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache openssl

# Copy package files and install only production dependencies
# Copy package files
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
# This runs postinstall which needs the schema we just copied
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Copy node_modules from builder to ensure prisma client is available if needed, 
# though usually npm ci --only=production is enough, but prisma client is generated in node_modules
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
# We use a script that runs migrations before starting if needed, 
# but for safety in simple deployments we just start the app.
CMD ["npm", "run", "start:prod"]
