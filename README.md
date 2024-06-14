# One Piece Chat

One Piece Chat is a chat app made with express and socket.io to test and use webSockets.
Socket.IO library to manage real-time, bidirectional communication between clients and the server. 
It handles user connections, room management, and messaging. 

The chat is usable at the URL https://onepiecechat.onrender.com

## Table of contents
- [Technologies](#technologies)
- [Express](#express)
- [Socket.io](#socketio)
- [gRPC](#gRPC)
- [Docker](#docker)

---
## Technologies
- Express
- Socket.io

### Express
For this project, we used express to make an express server, we initialized express 
like this :
````js
const __fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName);

const PORT = process.env.PORT || 8080;

const app = express();

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
````
We then had to establish the CORS policy :
````js
const io = new Server(expressServer, {
    cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204
    }
})
````

### Socket.io
To make use of websocket, we chose to use the library socket.io, as it 
more complete than websocket library, and it is safer. 

#### Detailed breakdown
1. Connection Event
````js
io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);
})
````
- When a user connects, a connection event is triggered, and a new socket object is created for that user.
- The server logs the user's connection.

2. Initial messages from the user
````js
    socket.emit('message', buildMsg(ADMIN, `Bienvenue sur l'île`));
    socket.emit('roomList', {
        rooms: getAllActiveRooms()
    });
````
- Send a welcome message to the user.
- Sends the list of all active rooms to the user.

3. Enter room event
````js
    socket.on('enterRoom', ({name, room}) => {
        const prevRoom = getUser(socket.id)?.room;
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} a quitté l'île`));
        }

        const user = activateUser(socket.id, name, room);

        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            });
        }

        socket.join(user.room);
        socket.emit('message', buildMsg(ADMIN, `Vous avez rejoint l'île ${user.room}`));
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} a rejoint l'île`));

        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        });

        io.emit('roomList', {
            rooms: getAllActiveRooms()
        });
    });
````
- User Leaves Previous Room: If the user was already in a room, they leave it, and the server notifies that room.
- Activate User: Updates the user's current room and other information.
- Notify Previous Room: Updates the user list for the previous room.
- Join New Room: The user joins the new room, and a welcome message is sent.
- Broadcast to Room: Notifies other users in the room that the user has joined.
- Update User Lists: Updates the user list for the new room and the list of active rooms for everyone.

4. Disconnection event
````js
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} quitte l'île`));
            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            });

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            });
        }

        console.log(`User ${socket.id} disconnected`);
    });
````
- When a user disconnects, the server updates the user's status.
- If the user was in a room, notifies the room of the user's departure and updates the user list.
- Updates the list of active rooms for everyone.

5. Message Event
````js
    socket.on('message', ({name, text}) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });
````
- Listens for a ``message`` event from the user.
- Broadcasts the message to all users in the same room.

6. Activity Event
````js
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });
````
- Listens for an ``activity`` event, which can represent various user activities.
- Broadcasts the activity to all other users in the same room.

### gRPC
To install grPC to the project, I follow these steps :
- Install the dependencies 
- Create a proto file to define the gRPC services
- Configure grpcServer
- Update the index.js file to include grpcServer

#### 1. Install the dependencies
I installed the following package :
````bash
npm install @grpc/grpc-js @grpc/proto-loader
````

#### 2. Create a proto file to define the gRPC services
I created a file named `chat.proto` in the `server` directory, here is what i put inside my proto file :
````protobuf
syntax = "proto3";

package chat;

service ChatService {
  rpc SendMessage (ChatMessage) returns (ChatResponse);
  rpc ReceiveMessage (Empty) returns (stream ChatMessage);
}

message ChatMessage {
  string user = 1;
  string message = 2;
  string room = 3;
}

message ChatResponse {
  string status = 1;
}

message Empty {}
````

#### 3. Configure grpcServer
I created a `grpcServer.js` file inside the `server` repository, used to start my gRPC server

#### 4. Update the index.js file to include grpcServer
I updated my ``index.js`` to include the gRPC server and the two new functions I created in ``grpcServer.js``,
I changed the ``socket.on(message)`` function :
````js
// Listening for message event
    socket.on('message', ({name, text}) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
            // grpc Message
            client.SendMessage({ user: name, message: text, room: room }, (err, response) => {
                if (err) console.error(err);
                else console.log('Response:', response);
            });
            const call = client.ReceiveMessage({});
            call.on('data', (message) => {
                console.log(`Received message from ${message.user}: ${message.message} in room: ${message.room}`);
            });

            call.on('end', () => {
                console.log('Stream ended.');
            });

            call.on('error', (e) => {
                console.error(e);
            });
        }
    });
````
---
## Docker
I used a dockerfile :
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

## Deployment
To deploy our project, we used render, the chat app is up on this adress : https://onepiecechat.onrender.com