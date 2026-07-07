# Сборка miniapp из репозитория и раздача статики nginx-ом.
# Контекст сборки — каталог miniapp/.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
