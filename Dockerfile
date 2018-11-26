FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY .eslintrc.json ./
COPY services/ ./services/
COPY test/ ./test/

RUN npm install

# Bundle app source
COPY config.json config.json
COPY app.js app.js
CMD [ "npm", "start" ]
