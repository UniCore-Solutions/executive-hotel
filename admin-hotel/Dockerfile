# syntax=docker/dockerfile:1
# Hotel Collection admin — Next.js 16 standalone output (port 3102)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM deps AS development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3102
CMD ["npm", "run", "dev"]


FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3102 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3102
CMD ["node", "server.js"]
