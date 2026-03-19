# Use Node.js 20
FROM node:20-alpine

# Install dependencies for Puppeteer & Chrome
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      # Added openssl for Prisma 7 compatibility
      openssl 

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_PATH=/app/node_modules

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# 1. Install dependencies
RUN pnpm install --frozen-lockfile

# 2. Approve builds (Fixes the error you mentioned)
RUN pnpm approve-builds

# 3. Copy the rest of the code (including prisma folder)
COPY . .

# 4. GENERATE PRISMA CLIENT (CRITICAL STEP)
# This creates the types inside node_modules before building TS
RUN pnpm exec prisma generate

# 5. Build the TypeScript code
RUN pnpm build

EXPOSE 5000

CMD ["pnpm", "start"]