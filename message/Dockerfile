FROM node:alpine

WORKDIR /app/message

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3007

CMD ["npm", "start"]