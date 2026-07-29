FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY . .
RUN npm run build:shared && npm run build:web && npm run build:server

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/komparsen.sqlite
COPY --from=build /repo/package.json /repo/package-lock.json* ./
COPY --from=build /repo/apps/server/package.json apps/server/package.json
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
RUN npm install --omit=dev --workspace apps/server --workspace packages/shared
COPY --from=build /repo/apps/server/dist apps/server/dist
COPY --from=build /repo/apps/server/src/db/migrations apps/server/dist/db/migrations
COPY --from=build /repo/apps/web/dist apps/web/dist

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
