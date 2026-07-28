FROM node:20-alpine

# Install build tools needed by some native addons
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Use npm install (more tolerant than npm ci on alpine with many deps)
# Increase node memory for large dependency trees
RUN node --max-old-space-size=4096 /usr/local/lib/node_modules/npm/bin/npm-cli.js install --include=dev --prefer-offline 2>&1 || \
    npm install --include=dev

COPY . .

# Build using explicit path so tsx is always found
RUN node_modules/.bin/tsx script/build.ts

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.js"]
