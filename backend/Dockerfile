FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./

# Install build tools and rebuild bcrypt
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm install --build-from-source bcrypt

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]