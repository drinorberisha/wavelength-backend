// src/controllers/game/gameController.js
const GameSession = require('../../models/GameSession');
const { findSessionById } = require('../../utils/gameSessionUtils');


exports.createGameSession = async (req, res) => {
    const { chooserId, chosenNumber } = req.body; // These should be passed in the request

    const newSession = new GameSession({
        gameState: {
            chooserId,
            chosenNumber,
            status: 'waiting', 
        }
    });

    try {
        const savedSession = await newSession.save();
        res.status(201).json(savedSession);
    } catch (error) {
        console.error('Error creating game session:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// src/controllers/game/gameController.js


exports.submitQuestion = async (req, res) => {
    const { sessionId, question } = req.body;
    
    try {
        const session = await findSessionById(sessionId);
        
        session.gameState.questionsAsked.push({ question });
        await session.save();
        
        // Emit an event to all clients in the session room with the new question
        req.io.to(sessionId).emit('questionSubmitted', { question });

        res.json({ message: 'Question submitted successfully', session });
    } catch (error) {
        console.error('Error submitting question:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.answerQuestion = async (req, res) => {
    const { sessionId, answer } = req.body;

    try {
        const session = await findSessionById(sessionId);

        // Assuming the last question asked is the one being answered
        const lastQuestionIndex = session.gameState.questionsAsked.length - 1;
        if(lastQuestionIndex < 0) {
            return res.status(400).json({ message: 'No question to answer' });
        }
        session.gameState.questionsAsked[lastQuestionIndex].answer = answer;
        await session.save();

        // Emit an event to all clients in the session room with the answer
        req.io.to(sessionId).emit('questionAnswered', { answer });

        res.json({ message: 'Answer submitted successfully', session });
    } catch (error) {
        console.error('Error answering question:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



exports.makeGuess = async (req, res) => {
    const { sessionId, guess } = req.body;

    try {
        const session = await findSessionById(sessionId);

        const result = await handleGuess(session, guess, req.user.id); // Assuming handleGuess is your new logic function

        // Emit event to all clients in the session room with the guess result
        req.io.to(sessionId).emit('guessMade', result.emitData);

        res.json({ message: result.message, session: result.session });
    } catch (error) {
        console.error('Error making a guess:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Example of a refactored logic function
async function handleGuess(session, guess, userId) {
    // Your logic for handling a guess, potentially updating the session, and preparing data for response and emit
    session.gameState.guessesLeft -= 1;
    let message = 'Guess is incorrect.';
    
    if (guess === session.gameState.chosenNumber) {
        session.gameState.status = 'finished';
        session.gameState.winnerId = userId;
        message = 'Correct guess! The game is over.';
    } else if (session.gameState.guessesLeft <= 0) {
        session.gameState.status = 'finished';
        message = 'No guesses left. The game is over.';
    }

    await session.save();

    const emitData = { guess, message, guessesLeft: session.gameState.guessesLeft };

    return { session, message, emitData };
}


exports.startVoting = async (req, res) => {
    const { sessionId, topics } = req.body;

    try {
        await initializeVoting(sessionId, topics);
        req.io.to(sessionId).emit('startVoting', topics);
        res.json({ message: 'Voting started successfully' });
    } catch (error) {
        console.error('Error starting voting:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Utility function to initialize voting in a game session
async function initializeVoting(sessionId, topics) {
    await GameSession.findByIdAndUpdate(sessionId, {
        $set: {
            'gameState.rounds.$[elem].topics': topics.map(topic => ({ topic, votes: [] })),
        }
    }, {
        arrayFilters: [{ 'elem.currentRound': true }], // Assuming you have a way to mark the current round
        new: true
    });
}


exports.processVote = async (req, res) => {
    const { sessionId, topicId, userId } = req.body;

    try {
        const result = await addVoteToTopic(sessionId, topicId, userId);
        if (result.allVotesIn) {
            const winningTopic = calculateWinningTopic(result.updatedSession); // Implement this function based on your logic
            req.io.to(sessionId).emit('voteResult', winningTopic);
            res.json({ message: 'Vote processed successfully, and all votes are in.' });
        } else {
            res.json({ message: 'Vote processed successfully' });
        }
    } catch (error) {
        console.error('Error processing vote:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Utility function to add a vote to a topic and check if all votes are in
async function addVoteToTopic(sessionId, topicId, userId) {
    const session = await GameSession.findOne({ "_id": sessionId, "gameState.status": "active" });
    if (!session) throw new Error('Active session not found');

    // Determine the current round
    const currentRoundIndex = session.gameState.currentRound - 1; // Assuming rounds are 1-indexed
    const currentRound = session.gameState.rounds[currentRoundIndex];
    if (!currentRound) throw new Error('Current round not found');

    // Find the topic within the current round
    const topic = currentRound.topics.find(t => t._id.equals(topicId));
    if (!topic) throw new Error('Topic not found');

    // Check if the user has already voted on this topic
    const hasVoted = topic.votes.includes(userId);
    if (hasVoted) {
        // Consider how you want to handle this case. For simplicity, we're just returning.
        return { message: 'User has already voted on this topic', allVotesIn: false };
    }

    // Add the user's vote
    topic.votes.push(userId);

    // Save the updated session
    await session.save();

    // Implement logic to check if all players have voted. This is a simplified placeholder.
    // You might compare the total votes for this topic against the total number of players minus the chooser.
    const allPlayersVoted = session.players.length - 1 <= topic.votes.length;

    return { updatedSession: session, allVotesIn: allPlayersVoted };
}

// This function assumes tallyVotes, calculatePercentages, and determineWinner are implemented and available

async function calculateWinningTopic(session) {
    if (!session || !session.gameState || !session.gameState.rounds) {
      throw new Error('Invalid session data');
    }
  
    // Assuming currentRound is 1-indexed
    const currentRound = session.gameState.rounds[session.gameState.currentRound - 1];
    if (!currentRound || !currentRound.topics) {
      throw new Error('Current round or topics not found');
    }
  
    // Tally votes for each topic
    const voteCounts = tallyVotes(currentRound.topics); // Implement this based on your structure
  
    // Calculate percentages for each topic's votes
    const votePercentages = calculatePercentages(voteCounts, session.players.length);
  
    // Determine the winning topic based on your criteria, e.g., highest percentage of votes
    const winningTopic = determineWinner(votePercentages);
  
    return winningTopic; // This should ideally be the topic or its ID
  }
  


/**
 * Tallies the votes for each topic in a round.
 * @param {Array} topics - The topics array from the current round.
 * @returns {Object} An object with topic IDs as keys and vote counts as values.
 */
function tallyVotes(topics) {
    const tally = {};
    topics.forEach(topic => {
      // Assuming topic._id is the identifier and topic.votes is the array of votes
      tally[topic._id] = topic.votes.length;
    });
    return tally;
  }
  
  /**
 * Calculates the vote percentages for each topic.
 * @param {Object} voteTally - The tallied votes for each topic.
 * @param {Number} totalVotes - The total number of votes cast.
 * @returns {Object} An object with topic IDs as keys and vote percentages as values.
 */
function calculatePercentages(voteTally, totalVotes) {
    const percentages = {};
    for (const topicId in voteTally) {
      percentages[topicId] = (voteTally[topicId] / totalVotes) * 100;
    }
    return percentages;
  }
  
/**
 * Determines the winning topic or indicates a re-vote is needed.
 * @param {Object} votePercentages - The vote percentages for each topic.
 * @returns {Object} An object with the winning topic ID or a re-vote indication.
 */
function determineWinner(votePercentages) {
    let maxPercentage = 0;
    let winnerId = null;
    let isTie = false;
  
    Object.entries(votePercentages).forEach(([topicId, percentage]) => {
      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        winnerId = topicId;
        isTie = false;
      } else if (percentage === maxPercentage) {
        isTie = true;
      }
    });
  
    if (isTie || maxPercentage <= (100 / Object.keys(votePercentages).length)) {
      return { needRevote: true };
    } else {
      return { winnerId: winnerId };
    }
  }
  



  exports.handleChooserResponse = async (sessionId, response, io) => { // io is passed here to use in broadcastRoundStart
    try {
        // Retrieve the current game session
        const gameSession = await findSessionById(sessionId);

        // Update the response for the current round
        const currentRoundIndex = gameSession.gameState.currentRound - 1;
        if (gameSession.gameState.rounds.length > currentRoundIndex) {
            gameSession.gameState.rounds[currentRoundIndex].answer = response;
        } else {
            throw new Error('Invalid round index');
        }
        
        // Check if this is the last round
        if (gameSession.gameState.currentRound >= gameSession.gameState.maxRounds) {
            gameSession.gameState.status = 'finished';
            const outcome = determineGameOutcome(gameSession);
            // Optionally, broadcast game over message here
            io.to(sessionId).emit('gameEnd', outcome);
        } else {
            // Transition to the next round
            await transitionToNextRound(sessionId); // Assuming transitionToNextRound updates and saves the session
            
            // Retrieve the updated session for broadcasting purposes
            const updatedSession = await findSessionById(sessionId);
            
            // Broadcast the start of the new round
            broadcastRoundStart(io, sessionId, updatedSession);
        }

        // Save any final updates to the game session
        await gameSession.save();

        return gameSession;
    } catch (error) {
        console.error('Error in handleChooserResponse:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
};

const transitionToNextRound = async (sessionId) => {
    try {
        const gameSession = await GameSession.findById(sessionId);
        if (!gameSession) {
            throw new Error('Game session not found');
        }

        // Check if we can proceed to the next round
        if (gameSession.gameState.currentRound < gameSession.gameState.maxRounds) {
            // Increment the round
            gameSession.gameState.currentRound += 1;

            // Reset round-specific data
            gameSession.guesses = []; // Reset guesses

            // Here you might also reassign roles or select a new topic/question as per your game logic

            // Save the updated game session
            await gameSession.save();
        } else {
            console.log('Maximum rounds reached. Game over or handle as needed.');
            // Handle game over scenario
        }

        return gameSession; // Return the updated game session for broadcasting
    } catch (error) {
        console.error('Error transitioning to next round:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
};


// Assuming you have access to the `io` (Socket.IO server instance) and the updated gameSession
const broadcastRoundStart = (io, sessionId, gameSession) => {
    // Construct the message for the new round
    const newRoundMessage = {
        round: gameSession.gameState.currentRound,
        topics: gameSession.gameState.rounds[gameSession.gameState.currentRound - 1].topics, // Example, adjust as needed
        // Add any other relevant data for the new round here
    };

    // Broadcast to all players in the session
    io.to(sessionId).emit('roundStart', newRoundMessage);
};


function determineGameOutcome(gameSession) {
    // Your logic here to calculate the winner, scores, etc.
    // For example:
    const outcome = {
        winner: 'PlayerID or Name', // Calculate based on your game's logic
        scores: {}, // Optional: Include final scores if applicable
        // Any other relevant outcome data
    };
    return outcome;
}