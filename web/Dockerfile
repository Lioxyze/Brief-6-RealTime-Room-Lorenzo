FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json

RUN pnpm -C web install --frozen-lockfile
COPY web ./web

RUN pnpm -C web build

FROM nginx:alpine

COPY web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
