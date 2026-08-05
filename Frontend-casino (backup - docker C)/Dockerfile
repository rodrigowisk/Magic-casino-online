# Usa uma imagem leve do Node.js
FROM node:20-alpine

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência primeiro
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Roda o servidor de desenvolvimento do Vite expondo para a rede externa
CMD ["npm", "run", "dev", "--", "--host"]