# Imagem oficial do Playwright (mantida pela Microsoft) com:
#  - Ubuntu 22.04 (jammy)
#  - Node.js 20 LTS
#  - Chromium/Firefox/Webkit já instalados em /ms-playwright
#  - Todas as libs do sistema que o Chromium precisa
#
# Versão fixada para casar com playwright@1.59.1 do package.json.
# Trocamos a base node:20-bookworm-slim + apt-get install manual de 17 libs
# porque o Debian bookworm passou a falhar com "invalid signature" no apt
# update (2026-05-20). Usar imagem oficial elimina o apt-get inteiro.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Postinstall do package.json roda `npx playwright install --with-deps`
# quando GEHC_SCRAPER_ENABLED=true. Aqui na build forçamos false porque o
# Chromium JÁ ESTÁ embutido na imagem — não precisa baixar de novo nem
# rodar apt-get install (que tenta deps do sistema). Em runtime, o Railway
# sobrescreve com GEHC_SCRAPER_ENABLED=true e o scraper funciona normal.
ENV GEHC_SCRAPER_ENABLED=false

# Diretório onde os browsers já estão instalados na imagem oficial.
# Garante que o runtime do Playwright procura eles aqui em vez de tentar
# baixar pra ~/.cache/ms-playwright (que não existe num container fresh).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
