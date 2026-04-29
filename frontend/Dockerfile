FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 е задължително за Windows Docker (bridge network)
CMD ["npm", "run", "dev"]
