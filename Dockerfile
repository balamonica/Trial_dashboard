FROM node:20-slim AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site
COPY . .
RUN npm run build

# Runtime image: serve static files
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# `serve` is already a devDependency, but installing globally keeps runtime small/simple
RUN npm i -g serve

COPY --from=build /app/dist ./dist

# Cloud Run listens on $PORT (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
