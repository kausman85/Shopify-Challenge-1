const express = require('express')
const bodyParser = require("body-parser");

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const app = express();
app.use(bodyParser.json());
let client;

const server = app.listen(process.env.PORT || 8080, async function () {
  client = await pool.connect();
  const port = server.address().port;
  console.log("App now running on port", port);
});

app.get("/api/test", (req, res) => {
  client.query('SELECT * FROM test_table').then(data => {
    res.status(200).json({results: data.rows});
  }).catch(err => {
    res.status(500).json({error: err});
  });
});
