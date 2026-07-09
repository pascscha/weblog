FROM node:alpine
WORKDIR /app/builder
COPY ./package.json ./
RUN npm install
COPY ./build.js ./
