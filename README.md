**Shopify Backend Challenge**

API endpoint: https://shopify-challenge-kaushal.herokuapp.com/

**Available APIs:**

_POST /api/inject-test-data_
\
API to populate database with default values for products. Overwrites current values and deletes all carts.

_POST /api/add-product_
\
Adds product.
\
Param: name (string): name of product
\
Param: inventory_count (int between 0 and 99,999): inventory of product
\
Param: price (USD amount between 0 and 9,999.99): price of product

_GET /api/get-products_
\
Returns all products.
\
Param: get_only_in_stock (optional boolean): Return only the products that are in stock

_GET /api/get-product_
\
Returns one product.
\
Param: product_id (int): id of product.

_POST /api/create-cart_
\
Creates new cart and returns id of cart. 

_POST /api/add-item-to-cart_
\
Adds item to cart.
\
Param: cart_id (int): id of cart. Cart must not be checked out.
\
Param: product_id (int): id of product. 

_POST /api/checkout-cart_
\
Proceeds to checkout for cart. Ensures that all products have inventory. Returns total price of products. 
\
Param: cart_id (int): id of cart. Cart must not be checked out.
