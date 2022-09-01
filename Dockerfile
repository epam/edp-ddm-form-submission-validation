FROM node:16-alpine

COPY ./dist/ /app/dist/
COPY ./package.json ./package-lock.json ./tsconfig.json ./tsconfig.build.json /app/

WORKDIR /app/

RUN npm ci --omit=dev

CMD ["npm", "start"]

EXPOSE 8080
