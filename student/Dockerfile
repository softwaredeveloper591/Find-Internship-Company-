FROM node

WORKDIR /app/student

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3004

CMD ["npm", "start"]