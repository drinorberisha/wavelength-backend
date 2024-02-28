const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game/gameRoutes'); // Adjusted path
const connectDB = require('./utils/db'); // Adjust the path as necessary
const socketMiddleware = require('./middlewares/socketMiddleware');
const jwt = require('jsonwebtoken');

const { setupSocketEventHandlers } = require('./handlers/socketHandlers');
// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(socketMiddleware(io)); // Use the middleware to attach io to every request


io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    // Set up all event handlers for this socket
    setupSocketEventHandlers(socket, io);
});

app.use('/auth', authRoutes);
app.use('/game', gameRoutes);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
