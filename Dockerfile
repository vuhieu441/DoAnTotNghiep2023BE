FROM node:alpine
WORKDIR '/app'
COPY ./package.json ./
RUN apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev make g++ && rm -rf /var/cache/apk/*
RUN npm install
COPY . .
CMD ["npm", "run", "start-manual"]
