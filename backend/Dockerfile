# Use Node.js 20
FROM node:20-alpine

# Install system dependencies for Puppeteer & Prisma
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      openssl 

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app

# Copy package files
COPY package.json ./
# If you have a lockfile (pnpm-lock.yaml or package-lock.json), copy it too!

# 1. Install dependencies
RUN npm install

# 2. Copy the rest of the code
COPY . .

# 3. Generate Prisma Client (Must happen before build)
RUN npx prisma generate

# 4. Build the TypeScript code
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]