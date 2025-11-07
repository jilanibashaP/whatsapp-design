// socket handlers for message events
module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('message', (data) => {
      console.log('Received message:', data);
      // TODO: handle incoming message and persist
      socket.broadcast.emit('message', data);
    });
  });
};
