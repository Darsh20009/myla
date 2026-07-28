FROM node:20-slim

# Install build tools needed by some native addons
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Use npm ci for fast, reliable installs in CI/CD environments
RUN npm ci --include=dev --no-audit --no-fund

COPY . .

# Build the project
RUN npx tsx script/build.ts

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.js"]
