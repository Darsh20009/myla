FROM node:20-slim

WORKDIR /app

# Copy pre-built output only — all dependencies are bundled inside dist/index.js
# No npm install needed at all
COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.js"]
