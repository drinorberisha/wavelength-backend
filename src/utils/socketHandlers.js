module.exports = (socket, io) => {
    socket.on('example_event', (data) => {
      console.log(data);
      // Handle the event
      io.emit('response_event', { message: 'Response from server' });
    });
  
    // Add more event listeners as needed
  };
  