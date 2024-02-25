const bcrypt = require('bcrypt');
const db = require('../../utils/db');

const registerUser = async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);
    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = registerUser;
