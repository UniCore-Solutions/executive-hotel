# syntax=docker/dockerfile:1
# Hotel Collection guest frontend — Next.js 16 standalone output

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM deps AS development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev"]


FROM deps AS builder
ARG NEXT_PUBLIC_USE_MOCK_SERVICES=false
ARG NEXT_PUBLIC_PLATFORM_SLUG=the-hotel-collection
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_FX_EUR=0.091
ARG NEXT_PUBLIC_FX_USD=0.100
ARG NEXT_PUBLIC_FX_GBP=0.078
ARG NEXT_PUBLIC_ENABLE_CHATBOT=false
ARG NEXT_PUBLIC_ENABLE_ANALYTICS=false
ENV NEXT_TELEMETRY_DISABLED=1
# next build bakes rewrites() into routes-manifest.json, so the internal API
# origin must be known at BUILD time (runtime env cannot alter it).
ARG API_INTERNAL_URL=http://backend:8080
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
COPY . .
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
