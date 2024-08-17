FROM node

WORKDIR /app/company

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3005

CMD ["npm", "start"]