# Stage 1: Build the application
# Pinned by digest so a rebuild of the same commit produces the same image.
# Dependabot's docker ecosystem keeps this current.
FROM node:26-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Disabling telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Run the application
FROM node:26-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for enterprise security hardening
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the compiled build files and necessary production assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health/live || exit 1

CMD ["node", "server.js"]
