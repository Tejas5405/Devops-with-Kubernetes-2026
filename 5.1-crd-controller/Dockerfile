FROM node:24-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY controller.js .

USER node

ENV PORT=3000
EXPOSE 3000

CMD ["node", "controller.js"]
