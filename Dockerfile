FROM node:20-alpine

# Install build tools needed by some native addons
RUN apk add --no-cache python3 make g++

# Pin npm to a stable version (v12 has "Exit handler never called" on Alpine)
RUN npm install -g npm@10.9.2

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install --include=dev

COPY . .

# Build the project
RUN npx tsx script/build.ts

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./dist/index.js"]
