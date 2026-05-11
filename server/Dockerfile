FROM ghcr.io/puppeteer/puppeteer:21.0.0

USER root

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# Copia apenas os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./

# Instala as dependências como root para evitar problemas de permissão
RUN npm install --omit=dev

# Copia o restante dos arquivos
COPY . .

# Garante que a pasta de autenticação do WhatsApp tenha permissões de escrita
RUN mkdir -p .wwebjs_auth && chmod -R 777 .wwebjs_auth

# Railway usará a variável PORT, mas o EXPOSE ajuda a documentar
EXPOSE 3001

CMD ["node", "server.js"]
