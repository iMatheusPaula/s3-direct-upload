# -------- stage deps --------
FROM oven/bun:1.3 AS deps

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install

# -------- stage dev (with hot reload) --------
FROM oven/bun:1.3 AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]

# -------- stage prod --------
FROM oven/bun:1.3 AS prod

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["bun", "run", "start"]
