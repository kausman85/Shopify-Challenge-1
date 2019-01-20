const express = require('express');
const bodyParser = require("body-parser");
const { Pool } = require('pg');

// Checks if a string denotes true
const isTrue = str => {
  return str && (str === true || str === 'true' || str === 'True');
};

// Prevents SQL injections by limiting the symbol set for strings
const validateString = str => {
  return str && str.length > 0 && /^[a-zA-Z0-9-_,./?!#%&*()]*$/.test(str) && str;
};

// Checks that the input is a valid int within bounds
const validateInt = (str, lower, upper) => {
  const val = Number(str);
  return val && val === Math.round(val) && val >= lower && (!upper || val <= upper) && val;
};

// Checks that the input is a valid amount of money within bounds
const validateMoney = (str, lower, upper) => {
  const val = Number(str) * 100;
  return validateInt(val, lower * 100, upper * 100) && val / 100;
};

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
    console.error(err);
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
    console.error(err);
    res.status(500).json({error: "Unknown error"});
  });
});

// Returns one product.
// Param: id (int): id of product.
app.get("/api/get-product", (req, res) => {
  const id = validateInt(req.query.product_id, 0);
  client.query("SELECT * FROM products WHERE id = 0" + id).then(ret => {
    const response = {
      id: ret.rows[0].id,
      title: ret.rows[0].name,
      price: ret.rows[0].price,
      inventory_count: ret.rows[0].inventory
    };

    res.status(200).json({data: response})
  }).catch(err => {
    console.error(err);
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
      console.error(err);
      res.status(500).json({error: "Unknown error"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});

app.post("/api/create-cart", (req, res) => {
  client.query("INSERT INTO carts(checkout) VALUES(false) RETURNING id;").then(ret => {
    console.log({ret});
    res.status(200).json({data: "Created cart with id " + ret.rows[0].id});
  }).catch(err => {
    console.error(err);
    res.status(500).json({error: "Unknown error"});
  });
});

app.post("/api/add-item-to-cart", (req, res) => {
  const cart_id = validateInt(req.query.cart_id, 0);
  const product_id = validateInt(req.query.product_id, 0);
  if (cart_id && product_id) {
    client.query(`SELECT * FROM carts WHERE id = ${cart_id} AND checkout = false;`).then(ret => {
      if (ret.rows.length !== 0) {
        client.query(`SELECT inventory FROM products WHERE id = ${product_id}`).then(ret => {
          console.log({ret});
          if (ret.rows.length === 0) {
            res.status(400).json({error: "Product not found"});
          } else if (ret.rows[0].inventory <= 0) {
            res.status(400).json({error: "No inventory"});
          } else {
            client.query(`
                INSERT INTO cart_items(product_id, cart_id) VALUES(${product_id}, ${cart_id});
                UPDATE products SET inventory = ${ret.rows[0].inventory - 1} WHERE id = ${product_id};`).then(ret => {
              res.status(200).json({data: "Added product to cart"});
            }).catch(err => {
              console.error(err);
              res.status(500).json({error: "Unknown error"});
            });
          }
        }).catch(err => {
          console.error(err);
          res.status(500).json({error: "Unknown error"});
        });
      } else {
        res.status(400).json({error: "Cart not found or is already checked out"});
      }
    }).catch(err => {
      console.error(err);
      res.status(500).json({error: "Unknown error"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});

app.post("/api/checkout-cart", (req, res) => {
  const id = validateInt(req.query.cart_id, 0);
  if (id) {
    client.query(`SELECT checkout FROM carts WHERE id = ${id} AND checkout = false;`).then(ret => {
      client.query(`
        UPDATE carts SET checkout = true WHERE id = ${id};
        SELECT SUM(price) AS price FROM products, cart_items WHERE cart_items.cart_id = ${id} AND cart_items.product_id = products.id;`).then(ret => {
        console.log({ret});
        res.status(200).json({data: "Checked out. Total price: $" + ret[1].rows[0].price});
      }).catch(err => {
        console.error(err);
        res.status(500).json({error: "Unknown error"});
      });
    }).catch(err => {
      res.status(400).json({error: "Cart not found or is already checkout out"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});

// Purchases a product. Reduces inventory of product by one. Product must be in stock.
// Param: id (int): id of product
app.post("/api/purchase-product", (req, res) => {
  const id = validateInt(req.query.product_id, 0);
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
          console.error(err);
          res.status(500).json({error: "Unknown error"});
        });
      }
    }).catch(err => {
      console.error(err);
      res.status(500).json({error: "Unknown error"});
    });
  } else {
    res.status(400).json({error: "Invalid parameter(s)"});
  }
});
