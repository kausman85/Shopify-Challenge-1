const express = require('express')
var bodyParser = require("body-parser");

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

var app = express();
app.use(bodyParser.json());

var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

app.get("/api/test", (req, res) => {
  res.status(200).json({"success": "yes"});
});

