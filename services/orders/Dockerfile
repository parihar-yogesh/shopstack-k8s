FROM node:26.13.0-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:26.13.0-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26.13.0-alpine3.24
ENV NODE_ENV=production
WORKDIR /app
# Alpine ships package fixes faster than this image is rebuilt, so the pinned
# base still carries known-vulnerable libraries until we upgrade them here.
RUN apk upgrade --no-cache
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY migrations ./migrations
# Nothing at runtime invokes a package manager, and the copies in the base image
# bring their own bundled dependencies, which scanners flag and package.json
# cannot fix.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
CMD ["node", "dist/server.js"]