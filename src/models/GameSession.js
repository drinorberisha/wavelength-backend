// models/GameSession.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const topicVoteSchema = new Schema({
  topic: String,
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const roundSchema = new Schema({
  topics: [topicVoteSchema],
  question: { type: String, default: '' },
  answer: { type: String, default: '' },
});

const gameSessionSchema = new Schema({
  players: [{
    playerId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['chooser', 'player'], default: 'player' }
  }],
  gameState: {
    chooserId: { type: Schema.Types.ObjectId, ref: 'User' },
    chosenNumber: { type: Number, required: true },
    currentRound: { type: Number, default: 1 },
    maxRounds: { type: Number, default: 3 },
    rounds: [roundSchema], // Using the defined roundSchema
    status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guessesLeft: { type: Number, default: 3 },
  },
  guesses: [
    {
      guesserId: { type: Schema.Types.ObjectId, ref: 'User' },
      guess: Number,
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GameSession', gameSessionSchema);
