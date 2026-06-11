const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('joinProject', (projectId) => {
      socket.join(projectId);
    });
    
    socket.on('taskUpdated', (data) => {
      socket.to(data.projectId).emit('taskChanged', data);
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { initSocket, getIo };
