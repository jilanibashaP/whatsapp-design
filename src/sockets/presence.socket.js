// socket handlers for presence/typing events
module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('presence', (payload) => {
      socket.broadcast.emit('presence', payload);
    });
  });
};
