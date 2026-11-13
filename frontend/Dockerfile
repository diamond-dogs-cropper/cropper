FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY . .
RUN npm run build


# Тот же nginx, но процесс работает от пользователя nginx, а не root.
# Порт 80 без root открывается благодаря net.ipv4.ip_unprivileged_port_start=0 (Docker 20.10+).
FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

