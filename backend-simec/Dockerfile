FROM node:20-bookworm-slim

# System libs required by Chromium (Playwright)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Instalação do Chromium em camada explícita, separada do `npm ci`.
# O postinstall condicional em package.json depende de GEHC_SCRAPER_ENABLED no
# ambiente, mas a layer `npm ci` é cacheada agressivamente pelo Docker e não
# invalida quando a env var muda. Resultado: tokens GE nunca eram capturados
# em produção (incidente 2026-05-11). A linha abaixo garante o binário sempre
# presente, ao custo de ~150MB no build do backend.
RUN npx playwright install --with-deps chromium

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
