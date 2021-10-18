# Build container
FROM node:14-alpine AS build

WORKDIR /usr/src/insight/
COPY . /usr/src/insight/

WORKDIR /usr/src/insight/client/
RUN yarn install
RUN yarn build

WORKDIR /usr/src/insight/server/
RUN yarn install
RUN yarn build

FROM node:14-alpine

COPY --from=build /usr/src/insight/server/ /usr/src/insight/server/
COPY --from=build /usr/src/insight/client/ /usr/src/insight/client/

WORKDIR /usr/src/insight/server/

EXPOSE 3000
CMD ["yarn", "start"]
