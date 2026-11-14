# syntax=docker/dockerfile:1

# Build und Laufzeit auf Bun (ADR 0001). Der Server baut nie, das Image
# entsteht in GitHub Actions und liegt in GHCR.

FROM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.4-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Echte Club-Bilder kommen per Volume, nicht aus dem Image (öffentliches Repo).
ENV CLUB_ASSETS_DIR=/app/club-assets

# Der SSR-Build lässt React und TanStack extern, deshalb Laufzeit-Abhängigkeiten.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun server.ts ./server.ts
RUN mkdir -p /app/club-assets && chown bun:bun /app/club-assets

USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["bun", "run", "server.ts"]
