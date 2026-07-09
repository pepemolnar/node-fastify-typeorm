# ---- build stage ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build                     # tsc -> dist/ (compiles data-source + migrations too)

# ---- runtime stage ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm pkg delete scripts.prepare \
  && npm ci --omit=dev && npm cache clean --force   # keeps the `typeorm` CLI for migration:run
COPY --chown=node:node --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
