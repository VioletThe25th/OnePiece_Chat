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

const client = new chatProto.ChatService('localhost:5050', grpc.credentials.createInsecure());

client.SendMessage({ user: 'User1', message: 'Hello, gRPC!' }, (err, response) => {
    if (err) console.error(err);
    else console.log('Response:', response);
});

// Recevoir des messages
const call = client.ReceiveMessage({});
call.on('data', (message) => {
    console.log(`Received message from ${message.user}: ${message.message}`);
});

call.on('end', () => {
    console.log('Stream ended.');
});

call.on('error', (e) => {
    console.error(e);
});
