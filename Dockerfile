# Tahap 1: Build Stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Inisialisasi database di dalam image
RUN node database.js

# Tahap 2: Production Stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app .
# Salin file database yang sudah diinisialisasi
COPY --from=build /app/app.db .

EXPOSE 3000
CMD ["npm", "start"]