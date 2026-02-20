FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json

RUN pnpm -C api install --prod --frozen-lockfile

COPY api ./api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "api/index.js"]
