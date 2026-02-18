FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache curl \
 && corepack enable \
 && corepack prepare pnpm@latest --activate

COPY api/package.json ./package.json
COPY pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY api/ .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "start"]
