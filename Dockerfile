FROM node:20-slim

WORKDIR /app

# Copy package files and pre-built dist (no build step needed)
COPY package*.json ./
COPY dist/ ./dist/

# Install production dependencies only (no devDeps = no esbuild/vite/tsx postinstall scripts)
RUN npm install --omit=dev --no-audit --no-fund

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.js"]
