FROM node:8-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY .eslintrc.json ./
COPY services/ ./services/
COPY test/ ./test/

RUN npm install

# Bundle app source
COPY config.js config.js
COPY app.js app.js
CMD [ "npm", "start" ]
