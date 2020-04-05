FROM node:12-alpine

RUN yarn global add pm2

WORKDIR /usr/src/app
COPY package.json ./
COPY yarn.lock ./

RUN yarn --production

COPY . .

RUN adduser -S sonosbot
USER sonosbot

CMD [ "pm2-runtime", "index.js" ]
