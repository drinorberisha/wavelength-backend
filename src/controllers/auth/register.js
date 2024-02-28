const bcrypt = require('bcrypt');
const User = require('../../models/User'); // Import the User model
const registerUser = async (req, res) => {
  const { username, password, email } = req.body;
  
  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  console.log('Email:', email); // This should log the email from req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, email: email });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = registerUser;
