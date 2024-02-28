const GameSession = require('../models/GameSession');

/**
 * Finds a game session by its ID.
 * @param {string} sessionId The ID of the session to find.
 * @returns {Promise<GameSession>} The found game session.
 * @throws {Error} If the session cannot be found.
 */
async function findSessionById(sessionId) {
    const session = await GameSession.findById(sessionId);
    if (!session) {
        throw new Error(`Game session not found for sessionId: ${sessionId}`);
    }
    return session;
}

module.exports = { findSessionById };
