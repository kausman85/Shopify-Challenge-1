const express = require('express');
const bodyParser = require("body-parser");

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

function isTrue(str) {
  return str && (str === true || str === 'true' || str === 'True');
}

const app = express();
app.use(bodyParser.json());
let client;

const server = app.listen(process.env.PORT || 8080, async function () {
  client = await pool.connect();
  const port = server.address().port;
  console.log("App now running on port", port);
});

app.post("/api/inject-test-data", (req, res) => {
  const testProducts = [
    ['Jacket',    4, 49.99],
    ['T-Shirt',   8, 9.99],
    ['Sweater',   0, 19.99],
    ['Pants',     5, 19.99],
    ['Socks',     1, 9.99],
    ['Shoes',     2, 39.99],
    ['Mittens',   5, 9.99],
    ['Underwear', 9, 19.99]
  ];

  const query = 'DELETE FROM products; ' + testProducts.map(product =>
    `INSERT INTO products(name, inventory, price) VALUES('${product[0]}', ${product[1]}, ${product[2]});`).join('');
  client.query(query).then(ret => {
    res.status(200).json({data: "Products reset to test data."})
  }).catch(err => {
    res.status(500).json({error: err});
  });
});

app.get("/api/get-products", (req, res) => {
  const query = "SELECT * FROM products" + (isTrue(req.query.get_only_in_stock) ? " WHERE inventory > 0" : "");
  client.query(query).then(ret => {
    const response = ret.rows.map(product => {return {
      title: product.title,
      price: product.price,
      inventory_count: product.inventory
    }});

    res.status(200).json({data: response})
  }).catch(err => {
    res.status(500).json({error: err});
  });
});
