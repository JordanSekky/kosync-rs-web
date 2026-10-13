# use the official Node image
FROM node:24-alpine AS base
WORKDIR /usr/src/app

# install dependencies and build the app
# copying the package files first lets docker cache the install layer
FROM base AS build
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

# copy the build output into the final image
# the nitro output bundles its own dependencies, so node_modules is not needed
FROM base AS release
ENV NODE_ENV=production
ENV PORT=8080
# KOSYNC_API_URL is the admin API as the browser reaches it. It is read when the
# container starts, so set it at run time (-e KOSYNC_API_URL=...). Unset, it
# falls back to /api on the same origin.
COPY --from=build /usr/src/app/.output .output

# run the app
USER node
EXPOSE 8080/tcp
ENTRYPOINT [ "node", ".output/server/index.mjs" ]
