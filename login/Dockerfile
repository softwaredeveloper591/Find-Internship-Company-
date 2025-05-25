FROM node:alpine

WORKDIR /app/login

COPY package.json .

RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]