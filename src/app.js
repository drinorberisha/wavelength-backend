const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use('/auth', authRoutes);

// Example Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');
  // Socket.IO logic here
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
