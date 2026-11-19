# The production image: Node.js 26 LTS (Debian slim, glibc, so sharp's prebuilt binary matches), built in one stage and
# run in another with production dependencies only, in production mode, as the image's unprivileged node user.
# The database is created and seeded on the first start, which needs no dev dependency. One volume holds all data.

# ---- Build: every dependency, then `next build`
FROM node:26-slim AS build
WORKDIR /app
# .npmrc: engine-strict and ignore-scripts (sharp installs its prebuilt package without a build step)
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Run: production dependencies, the build output, and the sources the app reads at run time
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production APP_HOST=0.0.0.0 DATA_DIR=/app/storage

COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

# server.ts runs as it is (Node's type stripping) and imports src/server/; the Code tab reads the example files from
# src/ at request time, so the image keeps src/; shared/ holds the seed, the definitions and the page files
COPY --from=build /app/.next ./.next
COPY server.ts next.config.ts tsconfig.json surveyjs-integration.json settings.env ./
COPY src ./src
COPY shared ./shared
RUN mkdir -p /app/storage && chown node:node /app/storage

USER node
EXPOSE 8000
VOLUME ["/app/storage"]
# node, not npm start: npm doesn't pass SIGTERM on, so `docker stop` would wait and kill
CMD ["node", "server.ts"]
