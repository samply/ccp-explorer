FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY vite.config.ts svelte.config.js ./
COPY src ./src
COPY static ./static

# Optional sub-path (e.g. /lens-mockup); empty = served at the root
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

# Build the SvelteKit project
RUN npm run build

# Production image
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["node", "build"]
