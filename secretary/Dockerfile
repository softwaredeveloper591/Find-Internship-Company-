FROM node

WORKDIR /app/secretary

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3006

CMD ["npm", "start"]