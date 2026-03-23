FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_USE_MOCK=true
ARG NEXT_PUBLIC_USE_MOCK_MIRROR=true
ARG NEXT_PUBLIC_HEDERA_TOPIC_IDS
ARG NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
ARG NEXT_PUBLIC_HUB_WS_URL=ws://localhost:8080/ws
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK
ENV NEXT_PUBLIC_USE_MOCK_MIRROR=$NEXT_PUBLIC_USE_MOCK_MIRROR
ENV NEXT_PUBLIC_HEDERA_TOPIC_IDS=$NEXT_PUBLIC_HEDERA_TOPIC_IDS
ENV NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL=$NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL
ENV NEXT_PUBLIC_HUB_WS_URL=$NEXT_PUBLIC_HUB_WS_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
