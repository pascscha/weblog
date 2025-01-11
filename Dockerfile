# Use the official Node.js image
FROM node:alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json to the container
COPY ./package.json ./

# Install the project dependencies
RUN npm install