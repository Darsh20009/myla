FROM node:20-slim

WORKDIR /app

# Install production dependencies (includes @whiskeysockets/baileys)
# This runs before copying dist so this layer is cached on re-deploys
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy pre-built app (server bundle + client assets)
COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.cjs"]
