FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci

COPY shared/ shared/
COPY server/ server/
COPY client/ client/
COPY tsconfig.base.json ./

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/server/dist/ server/dist/
COPY --from=builder /app/client/package.json client/
COPY --from=builder /app/client/dist/ client/dist/

RUN npm ci --omit=dev

RUN apk add --no-cache openssl

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 443

ENTRYPOINT ["/app/entrypoint.sh"]
