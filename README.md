# One Piece Chat

One Piece Chat is a chat app made with express and socket.io to test and use webSockets.

The chat is usable at the URL https://onepiecechat.onrender.com

## Table of contents
- [Architecture](#architecture)
- [Docker](#docker)


---
## Architecture

the architecture is quite simple, everything is in `server`.


---
## Docker
I use a dockerfile :
```Dockerfile
# Fetching the minified node image on apline linux
FROM node:slim

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /express-docker

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "index.js" ]
```

- We specify which node image we want to use, I used the `slim` version.
- We copy everything 
- We run the project