FROM node:8-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./

RUN npm install --only=production

# Bundle app source
COPY config.json config.json
COPY app.js app.js
CMD [ "npm", "start" ]
