# === Stage 1: Build ===
FROM node:22-alpine AS builder

WORKDIR /app

# Copiamo prima package.json per sfruttare la cache Docker
COPY package.json package-lock.json ./

# Installiamo le dipendenze
RUN npm ci

# Copiamo il codice sorgente e compiliamo
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# === Stage 2: Production ===
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiamo solo il JavaScript compilato dallo stage di build
COPY --from=builder /app/dist ./dist

# La KB verrà montata come volume
RUN mkdir -p /data/kb

# Non eseguiamo come root
RUN addgroup -S mcp && adduser -S mcp -G mcp
USER mcp

# Variabili d'ambiente di default
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV PORT=3000
ENV HOST=0.0.0.0
ENV KB_ROOT_PATH=/data/kb
ENV DOTENV_CONFIG_QUIET=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]