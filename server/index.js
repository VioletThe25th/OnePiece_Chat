import express from 'express';
import { Server } from "socket.io";
import path from 'path';
import { fileURLToPath } from 'url';

const __fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName);

const PORT = process.env.PORT || 8080;
const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

// state
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204
    }
})
io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // at connection - To user only
    socket.emit('message', buildMsg(ADMIN, `Bienvenue sur l'île`));
    socket.emit('roomList', {
        rooms: getAllActiveRooms()
    })

    socket.on('enterRoom', ({name, room}) => {

        // leave the previous room the user was connected in
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} a quitté l'île`));
        }

        const user = activateUser(socket.id, name, room)

        // Cannot update previous room users list after the state update in activate user
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        // join room
        socket.join(user.room);

        // To user who joined the room
        socket.emit('message', buildMsg(ADMIN, `Vous avez rejoint l'île ${user.room}`));

        // To everyone else
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} a rejoint l'île`));

        // Update user list for room
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        })

        // Update rooms list for everyone
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
    })

    // At disconnection - to others
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message',
                buildMsg(ADMIN, `${user.name} quitte l'île`));

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`);
    })

    // Listening for message event
    socket.on('message', ({name, text}) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // Listening for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    })
});

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('fr-FR', {
            timeZone: "Europe/Paris",
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        }).format(new Date())
    }
}

// Users functions
function activateUser(id, name, room) {
    const user = {id, name, room};
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user;
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}