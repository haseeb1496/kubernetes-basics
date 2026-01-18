FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY controller.js ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "controller.js"]