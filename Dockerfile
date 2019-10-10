FROM node:12-alpine
MAINTAINER Ryan Petschek <petschekr@gmail.com>

# Deis wants bash
RUN apk update
RUN apk add bash
RUN apk add git

# Set Timezone to EST
RUN apk add tzdata
ENV TZ="/usr/share/zoneinfo/America/New_York"
ENV NODE_ENV="production"

# Bundle app source
WORKDIR /usr/src/groundtruth
COPY . /usr/src/groundtruth

RUN npm install
RUN npm run build

FROM node:12-alpine
WORKDIR /usr/src/groundtruth
COPY --from=0 /usr/src/groundtruth .
EXPOSE 3000
CMD ["npm", "start"]
