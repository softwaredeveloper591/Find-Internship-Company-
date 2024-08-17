FROM node

WORKDIR /app/login

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]