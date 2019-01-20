const express = require('express');
const bodyParser = require("body-parser");
const { Pool } = require('pg');

import {isTrue, validateString, validateInt, validateMoney} from "./utils";

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

// API to populate database with default values for products. Overwrites current values.
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
    res.status(500).json({error: "Unknown error"});
  });
});

// Returns all products.
// Param: get_only_in_stock (optional boolean): Return only the products that are in stock
app.get("/api/get-products", (req, res) => {
  const query = "SELECT * FROM products" + (isTrue(req.query.get_only_in_stock) ? " WHERE inventory > 0" : "");
  client.query(query).then(ret => {
    const response = ret.rows.map(product => {return {
      id: product.id,
      title: product.name,
      price: product.price,
      inventory_count: product.inventory
    }});

    res.status(200).json({data: response})
  }).catch(err => {
    res.status(500).json({error: "Unknown error"});
  });
});

// Returns one product.
// Param: id (int): id of product.
app.get("/api/get-product", (req, res) => {
  const id = validateInt(req.query.id, 0);
  client.query("SELECT * FROM products WHERE id = 0" + id).then(ret => {
    const response = {
      id: ret.rows[0].id,
      title: ret.rows[0].name,
      price: ret.rows[0].price,
      inventory_count: ret.rows[0].inventory
    };

    res.status(200).json({data: response})
  }).catch(err => {
    res.status(500).json({error: "Unknown error"});
  });
});

// Adds product.
// Param: name (string): name of product
// Param: inventory_count (int between 0 and 99,999): inventory of product
// Param: price (USD amount between 0 and 9,999.99): price of product
app.post("/api/add-product", (req, res) => {
  const name = validateString(req.query.title);
  const inventory = validateInt(req.query.inventory_count, 0, 99999);
  const price = validateMoney(req.query.price, 0, 9999.99);
  if (name && inventory && price) {
    client.query(`INSERT INTO products(name, inventory, price) VALUES('${name}', ${inventory}, ${price});`).then(ret => {
      res.status(200).json({data: "Added product"});
    }).catch(err => {
      res.status(500).json({error: "Unknown error"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});

// Purchases a product. Reduces inventory of product by one. Product must be in stock.
// Param: id (int): id of product
app.post("/api/purchase-product", (req, res) => {
  const id = validateInt(req.query.id, 0);
  if (id) {
    client.query(`SELECT id, inventory FROM products WHERE id = ${id};`).then(ret => {
      if (ret.rows.length === 0) {
        res.status(400).json({error: "Product not found"});
      } else if (ret.rows[0].inventory <= 0) {
        res.status(400).json({error: "No inventory"});
      } else {
        client.query(`UPDATE products SET inventory = ${ret.rows[0].inventory - 1} WHERE id = ${ret.rows[0].id};`).then(ret => {
          res.status(200).json({data: "Purchased product"});
        }).catch(err => {
          res.status(500).json({error: "Unknown error"});
        });
      }
    }).catch(err => {
      res.status(500).json({error: "Unknown error"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});
