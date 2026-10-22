FROM node:20-bookworm-slim AS build
WORKDIR /src

COPY . /src/system/platform/almanac
COPY --from=archon-ui . /src/frameworks/archon-ui

WORKDIR /src/system/platform/almanac/Almanac/Almanac.Web

ARG VITE_API_BASE_URL=https://almanac.mainstay.com.br/api
ARG VITE_IDENTITY_MANAGEMENT_URL=https://auth.mainstay.com.br
ARG VITE_OIDC_CLIENT_ID=almanac-web
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_IDENTITY_MANAGEMENT_URL=${VITE_IDENTITY_MANAGEMENT_URL}
ENV VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}

RUN npm ci
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/system/platform/almanac/Almanac/Almanac.Web/dist /usr/share/nginx/html

EXPOSE 80
