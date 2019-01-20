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

function validateString(str) {
  return str && str.length > 0 && /^[a-zA-Z0-9-_,./?!#%&*()]*$/.test(str) && str;
}

function validateInt(str, lower, upper) {
  const val = Number(str);
  return val && val === Math.round(val) && val >= lower && val <= upper && val;
}

function validateMoney(str, lower, upper) {
  const val = Number(str) * 100;
  return validateInt(val, lower * 100, upper * 100) && val / 100;
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
    res.status(200).json({data: "Products reset to test data"})
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

app.post("/api/add-product", (req, res) => {
  const name = validateString(req.query.name);
  const inventory = validateInt(req.query.inventory_count, 0, 99999);
  const price = validateMoney(req.query.price, 0, 9999.99);
  console.log({name, inventory, price});
  if (name && inventory && price) {
    client.query(`INSERT INTO products(name, inventory, price) VALUES('${name}', ${inventory}, ${price});`).then(ret => {
      res.status(200).json({data: "Added product"});
    }).catch(err => {
      res.status(500).json({error: err});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});
