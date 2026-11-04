# Multi-stage production Dockerfile for Node.js Express backend

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY scripts ./scripts

RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Create uploads directory with appropriate permissions
RUN mkdir -p uploads/attachments && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "dist/src/server.js"]
