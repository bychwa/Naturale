FROM node
RUN mkdir -p ./app
COPY . ./app
WORKDIR ./app
EXPOSE 80
CMD [ "npm", "start" ]