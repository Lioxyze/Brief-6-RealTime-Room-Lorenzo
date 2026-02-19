FROM node:20-alpine

WORKDIR /app

# pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9 --activate

# copier les fichiers nécessaires au workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json

# installer uniquement les deps de l'api
RUN pnpm -C api install --prod --frozen-lockfile

# copier le code
COPY api ./api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "api/index.js"]
