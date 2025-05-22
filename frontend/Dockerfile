# ─── BUILD STAGE ───────────────────────────────────────────────────────────────
FROM node:16-alpine AS builder
WORKDIR /app

# copy deps manifest & install
COPY package*.json ./
RUN npm install

# copy source & build
COPY . .
RUN npm run build

# ─── PRODUCTION STAGE ─────────────────────────────────────────────────────────
FROM nginx:alpine
# remove default site
RUN rm -rf /usr/share/nginx/html/*
# copy built files
COPY --from=builder /app/build    /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# optional: drop .conf into /etc/nginx/conf.d/default.conf if you want custom headers
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
