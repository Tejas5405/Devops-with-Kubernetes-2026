FROM node:24-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY app.js .

USER node

ENV PORT=3000
EXPOSE 3000

CMD ["node", "app.js"]
