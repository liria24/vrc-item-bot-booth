FROM oven/bun:1.3.14 AS install

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM install AS build

COPY . .
RUN bun run build

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.output ./.output

RUN mkdir -p /app/data/kv

EXPOSE 3000

CMD ["bun", "run", "./.output/server/index.mjs"]
