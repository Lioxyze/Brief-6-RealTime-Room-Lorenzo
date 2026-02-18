FROM node:24-alpine AS builder

WORKDIR /app

RUN npm i -g pnpm@9

COPY pnpm-lock.yaml ./
COPY web/package.json ./package.json

RUN pnpm install --no-frozen-lockfile

COPY web/ .

RUN pnpm build

FROM nginx:alpine

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
