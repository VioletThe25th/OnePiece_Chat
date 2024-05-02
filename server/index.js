import express from 'express';
import { Server } from "socket.io";
import path from 'path';
import { fileURLToPath } from 'url';

const __fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName);

const PORT = process.env.PORT || 8080;

const app = express();

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false :
            ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})
io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // at connection - To user only
    socket.emit('message', "Bienvenue dans la chambre du chapeau de paille");

    // at connection - To others
    socket.broadcast.emit('message', `Bienvenue au nouveau chapeau de paille : ${socket.id.substring(0,5)}`);

    // Listening for message event
    socket.on('message', data => {
        console.log(data);
        io.emit('message', `${socket.id.substring(0,5)} : ${data}`);
    });

    // At disconnection - to others
    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `Le chapeau de paille ${socket.id.substring(0,5)} nous as quittés`);
    })

    // Activity
    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name);
    })
});