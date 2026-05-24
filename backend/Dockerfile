FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package*.json ./
RUN npm install

# Copia código fonte
COPY . .

# Gera Prisma client e compila TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
