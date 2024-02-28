// socketHandlers.js
const Joi = require('joi'); // Import Joi
const gameController = require('./controllers/gameController'); // Adjust the path as necessary

// Define validation schemas
const joinGameSchema = Joi.object({
    sessionId: Joi.string().required(),
});

const startVotingSchema = Joi.object({
    sessionId: Joi.string().required(),
    topics: Joi.array().items(Joi.string()).min(1),
});

const submitVoteSchema = Joi.object({
    sessionId: Joi.string().required(),
    topicId: Joi.string().required(),
    userId: Joi.string().required(),
});

const chooserResponseSchema = Joi.object({
    sessionId: Joi.string().required(),
    response: Joi.string().required(),
});

function setupSocketEventHandlers(socket, io) {
    let idleTimeout;


    const resetIdleTimeout = () => {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            console.log(`Disconnecting idle user: ${socket.id}`);
            socket.disconnect(true);
        }, 300000); // 5 minutes of inactivity
    };


    socket.on('joinGame', ({ sessionId }) => {
        const { error } = joinGameSchema.validate({ sessionId });
        if (error) {
            return socket.emit('error', { message: 'Invalid data received for joinGame' });
        }
        console.log(`User joined game session: ${sessionId}`);
        socket.join(sessionId);
        resetIdleTimeout();
    });


    socket.on('startVoting', ({ sessionId, topics }) => {
        const { error } = startVotingSchema.validate({ sessionId, topics });
        if (error) {
            return socket.emit('error', { message: 'Invalid data received for startVoting' });
        }
        io.to(sessionId).emit('startVoting', { topics });
        resetIdleTimeout();
    });


    socket.on('submitVote', async ({ sessionId, topicId, userId }) => {
        const { error } = submitVoteSchema.validate({ sessionId, topicId, userId });
        if (error) {
            return socket.emit('error', { message: 'Invalid data received for submitVote' });
        }
        await gameController.submitVote(sessionId, topicId, userId);
        resetIdleTimeout();
    });


    socket.on('submitResponse', async ({ sessionId, response }) => {
        const { error } = chooserResponseSchema.validate({ sessionId, response });
        if (error) {
            return socket.emit('error', { message: 'Invalid data received for submitResponse' });
        }

        try {
            // Assuming gameController has a method to handle the response
            await gameController.handleChooserResponse(sessionId, response, io);

            // Broadcast the Chooser's response to all players in the session
            io.to(sessionId).emit('roundResponse', { response });

        } catch (err) {
            console.error('Error in submitResponse:', err);
            socket.emit('error', { message: 'Error processing the Chooser\'s response.' });
        }

        resetIdleTimeout();
    });


    socket.on('disconnect', () => {
        clearTimeout(idleTimeout);
    });
}

module.exports = { setupSocketEventHandlers };
