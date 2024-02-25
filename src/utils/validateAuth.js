const { body, validationResult } = require('express-validator');

// Validation rules for login
exports.validateLogin = [
    body('email').isEmail().withMessage('Enter a valid email address.'),
    body('password').not().isEmpty().withMessage('Password is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
