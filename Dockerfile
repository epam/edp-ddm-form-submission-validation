FROM node:16-alpine
ENV USER_UID=1001 \
    USER_NAME=form-submission-validation
RUN addgroup --gid ${USER_UID} ${USER_NAME} \
     && adduser --disabled-password --uid ${USER_UID} --ingroup ${USER_NAME} ${USER_NAME}
COPY ./dist/ /app/dist/
COPY ./package.json ./package-lock.json ./tsconfig.json ./tsconfig.build.json /app/

WORKDIR /app/

RUN npm ci --omit=dev
USER form-submission-validation
CMD ["npm", "start"]

EXPOSE 8080
