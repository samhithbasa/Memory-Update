FROM node:18

# Install all compilers
RUN apt-get update && \
    apt-get install -y python3 python3-pip g++ gcc default-jdk && \
    apt-get clean

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

CMD ["node", "Api.js"]