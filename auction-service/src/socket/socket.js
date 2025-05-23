import { Server } from 'socket.io';

let io;

export const createSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
  });
};

export const getIO = () => io;
