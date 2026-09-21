FROM oven/bun:1.4 AS base
WORKDIR /app

# -------- development dependencies --------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# -------- production dependencies --------
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# -------- stage dev (with hot reload) --------
FROM base AS dev

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]

# -------- stage prod --------
FROM base AS prod

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY public ./public

USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
