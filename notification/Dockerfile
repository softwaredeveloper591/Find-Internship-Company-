FROM node

WORKDIR /app/notification

COPY package.json .

RUN npm install

COPY . .

CMD ["npm", "start"]