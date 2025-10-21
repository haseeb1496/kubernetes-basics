FROM node:20-alpine

WORKDIR /usr/src/app

COPY package* ./

RUN npm ci

COPY . .

EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]