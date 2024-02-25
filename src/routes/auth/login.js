const express = require('express');
const loginUser = require('../../controllers/auth/login');
const { validateLogin } = require('../../utils/validateAuth');
const router = express.Router();

router.post('/', validateLogin, loginUser);

module.exports = router;
