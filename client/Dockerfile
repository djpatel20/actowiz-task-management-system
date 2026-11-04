# Multi-stage production Dockerfile for React Vite SPA with Nginx

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN npm run build

# Stage 2: Web Server
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
