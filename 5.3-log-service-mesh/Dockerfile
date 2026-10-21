FROM node:24-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY greeter.js .

USER node

ENV PORT=3000
ENV GREETING="Hello from greeter v1"
EXPOSE 3000

CMD ["node", "greeter.js"]
