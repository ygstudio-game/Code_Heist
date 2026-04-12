# Use Node.js 20
FROM node:20-alpine

# Install system dependencies
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

# Copy package files (Note: we only copy package.json since you don't have a lockfile)
COPY package.json ./

# 1. Install dependencies using npm
RUN npm install

# 2. Copy the rest of the code
COPY . .

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the TypeScript code
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]