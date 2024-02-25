require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const exampleRoutes = require('./routes/exampleRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', exampleRoutes);

io.on('connection', (socket) => {
  console.log('a user connected');
  require('./utils/socketHandlers')(socket, io);
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
