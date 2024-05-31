import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve('chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

const messageQueue = [];

const chatService = {
    SendMessage: (call, callback) => {
        const message = call.request;
        console.log(`Message sent from ${message.user} : ${message.message} in room : ${message.room}`);
        // Ajouter le message à la file d'attente
        messageQueue.push(message);
        // Répondre immédiatement au client gRPC
        callback(null, { status: 'Message received' });
    },
    ReceiveMessage: (call) => {
        // Envoyer tous les messages existants dans la file d'attente
        messageQueue.forEach(message => {
            call.write(message);
        });
        // Créer un intervalle pour envoyer de nouveaux messages en continu
        const intervalId = setInterval(() => {
            while (messageQueue.length > 0) {
                const message = messageQueue.shift();
                call.write(message);
            }
        }, 1000);
        // Gestion de la fin du stream
        call.on('end', () => {
            clearInterval(intervalId);
            call.end();
        });
    }
};

const server = new grpc.Server();
server.addService(chatProto.ChatService.service, chatService);

server.bindAsync('localhost:5050', grpc.ServerCredentials.createInsecure(), () => {
    console.log('gRPC server running at http://localhost:5050');
});
