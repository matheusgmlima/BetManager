FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package*.json ./
RUN npm install

# Copia código fonte
COPY . .

# Gera Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
