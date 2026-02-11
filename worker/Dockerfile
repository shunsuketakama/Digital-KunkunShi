FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV PORT=8080
CMD ["npx", "tsx", "worker/src/index.ts"]
