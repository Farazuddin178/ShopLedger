var test = require('node:test');
var assert = require('node:assert/strict');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

function rice(stock, reserved) {
  return { id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 100, stock: stock, reserved: reserved };
}

function orderLine(product, qty) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    hsn: product.hsn,
    price: product.price,
    qty: qty
  };
}

test('CURRENT BEHAVIOUR: check accepts selling the last sellable unit', function () {
  var product = rice(1, 0);

  assert.equal(inventory.getSellableStock(product), 1);
  assert.deepEqual(inventory.check([product], [orderLine(product, 1)]), { ok: true });
});

test('CURRENT BEHAVIOUR: check rejects two units when only one is sellable', function () {
  var product = rice(1, 0);

  assert.deepEqual(inventory.check([product], [orderLine(product, 2)]), {
    ok: false,
    msg: 'Rice is out of stock (1 sellable available)'
  });
});

test('CURRENT BEHAVIOUR: check accepts zero units when one is sellable', function () {
  var product = rice(1, 0);

  assert.deepEqual(inventory.check([product], [orderLine(product, 0)]), { ok: true });
});

test('CURRENT BEHAVIOUR: check accepts the one unit left after wholesale reservations', function () {
  var product = rice(4, 3);

  assert.equal(inventory.getSellableStock(product), 1);
  assert.deepEqual(inventory.check([product], [orderLine(product, 1)]), { ok: true });
});

test('CURRENT BEHAVIOUR: cancelling a pending order returns stock', function () {
  var product = rice(4, 1);
  var items = [orderLine(product, 2)];
  var db = { products: [product], orders: [], nextOrderId: 1001 };

  assert.deepEqual({ stock: product.stock, reserved: product.reserved }, { stock: 4, reserved: 1 });
  assert.deepEqual(inventory.check(db.products, items), { ok: true });

  inventory.reserve(db.products, items);
  var order = orders.add(db, { status: 'pending', paymentMode: 'cash', items: items });

  assert.equal(order.status, 'pending');
  assert.deepEqual({ stock: product.stock, reserved: product.reserved }, { stock: 2, reserved: 1 });

  var result = orders.cancel(db, order.id, 'Customer cancelled');

  assert.equal(result.ok, true);
  assert.equal(order.status, 'cancelled');
  assert.deepEqual({ stock: product.stock, reserved: product.reserved }, { stock: 4, reserved: 1 });
});


test('stock check accepts exactly the sellable quantity and rejects more', function () {
  var product = rice(4, 3);

  assert.deepEqual(inventory.check([product], [orderLine(product, 2)]), {
    ok: false,
    msg: 'Rice is out of stock (1 sellable available)'
  });
  assert.deepEqual(inventory.check([product], [orderLine(product, 1)]), { ok: true });
});

test('stock check rejects repeated lines whose combined quantity exceeds availability', function () {
  var product = rice(5, 2);

  assert.deepEqual(inventory.check([product], [orderLine(product, 2), orderLine(product, 2)]), {
    ok: false,
    msg: 'Rice is out of stock (3 sellable available)'
  });
  assert.deepEqual(inventory.check([product], [orderLine(product, 2), orderLine(product, 1)]), { ok: true });
});

test('cancelling a pending order restores physical stock exactly once', function () {
  var product = rice(4, 1);
  var items = [orderLine(product, 2)];
  var db = { products: [product], orders: [], nextOrderId: 1001 };

  inventory.reserve(db.products, items);
  var order = orders.add(db, { status: 'pending', paymentMode: 'cash', items: items });

  assert.equal(orders.cancel(db, order.id).ok, true);
  assert.equal(orders.cancel(db, order.id).ok, false);
  assert.deepEqual({ stock: product.stock, reserved: product.reserved }, { stock: 4, reserved: 1 });
});
