// src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../../controllers/game/gameController'); // Ensure the path is correct
// Route to create a new game session
router.post('/createSession', gameController.createGameSession);

router.post('/submitQuestion', gameController.submitQuestion);
router.post('/answerQuestion', gameController.answerQuestion);
router.post('/makeGuess', gameController.makeGuess);


module.exports = router;
