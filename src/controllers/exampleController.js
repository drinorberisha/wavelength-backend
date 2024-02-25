const db = require('../models/exampleModel');

const getExampleData = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM your_table_name LIMIT 10');
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

module.exports = {
  getExampleData,
};
