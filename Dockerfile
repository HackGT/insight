# Build container
FROM node:12-alpine

WORKDIR /usr/src/insight/
COPY . /usr/src/insight/

WORKDIR /usr/src/insight/client/
RUN yarn install
RUN yarn build

FROM node:12-alpine

COPY --from=build /usr/src/timber/server/ /usr/src/timber/server/
COPY --from=build /usr/src/timber/client/ /usr/src/timber/client/

WORKDIR /usr/src/timber/server/

EXPOSE 3000
CMD ["yarn", "start"]
