# Dockerfile

# --- Stage 1: Build a production-ready Next.js app ---
# Use the official Node.js 18 image as a base
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and lock files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
# This will create the .next directory
RUN npm run build

# --- Stage 2: Create a minimal production image ---
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
# Copy the service account key
COPY --from=builder /app/serviceAccountKey.json ./serviceAccountKey.json


# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the server in production mode
CMD ["npm", "start"]