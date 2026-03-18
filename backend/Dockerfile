# Use Node.js 20
FROM node:20-alpine

# Install dependencies for Puppeteer & Chrome
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# This allows TS to find Node types
ENV NODE_PATH=/app/node_modules

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# 1. Install dependencies (frozen-lockfile is safer for Docker)
RUN pnpm install --frozen-lockfile

# 2. CRITICAL: Approve the build scripts for dependencies (fix for your error)
RUN pnpm approve-builds

# Copy the rest of the code
COPY . .

# Build the TypeScript code
RUN pnpm build

EXPOSE 5000

CMD ["pnpm", "start"]