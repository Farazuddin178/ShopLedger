var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var dates = require('../lib/dates');
var ledger = require('../lib/ledger');

var history = {
  orders: [
    { id: 1, date: '15/03/2022' },
    { id: 2, date: '30/01/2022' },
    { id: 3, date: '28/12/2021' }
  ]
};

function khata() {
  return {
    customers: [{
      id: 1,
      name: 'Meera Joshi',
      openingBalance: 450,
      totalBilled: 1982.01,
      totalSettled: 1200,
      balance: 1232.01
    }],
    settlements: [],
    nextSettlementId: 501
  };
}

test('CURRENT BEHAVIOUR: order history sorts newest first', function () {
  assert.deepEqual(orders.list(history).map(order => order.id), [1, 2, 3]);
});

test('CURRENT BEHAVIOUR: the January date-picker range excludes March and December', function () {
  var filtered = orders.list(history, { from: '2022-01-01', to: '2022-01-31' });

  assert.deepEqual(filtered.map(order => order.id), [2]);
});

test('CURRENT BEHAVIOUR: normalizeDateKey produces a day-first comparison key', function () {
  assert.equal(dates.normalizeDateKey('2022-03-15'), '15/03/2022');
  assert.equal(dates.normalizeDateKey(' 30/01/2022 '), '30/01/2022');
  assert.equal(dates.normalizeDateKey(''), '');
});

test('CURRENT BEHAVIOUR: getFiscalYear rolls over in April', function () {
  assert.equal(dates.getFiscalYear('31/03/2022'), 'FY21-22');
  assert.equal(dates.getFiscalYear('2022-04-01'), 'FY22-23');
});

test('CURRENT BEHAVIOUR: a numeric settlement adds to Total Settled and lowers the balance', function () {
  var db = khata();
  var result = ledger.recordSettlement(db, 1, 500);

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
  assert.deepEqual(db.settlements, [result.settlement]);
  assert.equal(db.nextSettlementId, 502);
});

test('CURRENT BEHAVIOUR: a string settlement adds numerically to Total Settled', function () {
  var db = khata();
  var result = ledger.recordSettlement(db, 1, '500');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
  assert.deepEqual(db.settlements, [result.settlement]);
});

test('CURRENT BEHAVIOUR: zero and negative settlement amounts are rejected without changes', function () {
  [0, -500, '0', '-500'].forEach(function (amount) {
    var db = khata();

    assert.deepEqual(ledger.recordSettlement(db, 1, amount), {
      ok: false,
      error: 'Settlement amount must be greater than zero'
    });
    assert.deepEqual(db, khata());
  });
});

test('CURRENT BEHAVIOUR: a non-numeric settlement is rejected without changes', function () {
  var db = khata();

  assert.deepEqual(ledger.recordSettlement(db, 1, 'abc'), {
    ok: false,
    error: 'Settlement amount must be greater than zero'
  });
  assert.deepEqual(db, khata());
});

test('order history sorts newest first across months, years, and same-day orders', function () {
  var sameDayHistory = { orders: history.orders.concat({ id: 4, date: '15/03/2022' }) };

  assert.deepEqual(orders.list(sameDayHistory).map(order => order.id), [4, 1, 2, 3]);
});

test('date-picker bounds are chronological and inclusive', function () {
  assert.deepEqual(orders.list(history, { from: '2022-01-01', to: '2022-01-31' }).map(order => order.id), [2]);
  assert.deepEqual(orders.list(history, { from: '2022-01-30', to: '2022-03-15' }).map(order => order.id), [1, 2]);
  assert.deepEqual(orders.list(history, { from: '2022-01-30' }).map(order => order.id), [1, 2]);
  assert.deepEqual(orders.list(history, { to: '2022-01-30' }).map(order => order.id), [2, 3]);
});

test('a form settlement of 500 produces the same ledger totals as a numeric payment', function () {
  var db = khata();
  var result = ledger.recordSettlement(db, 1, '500');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});

test('invalid settlement amounts are rejected before mutating the ledger', function () {
  [0, -500, 'abc', '', '   ', Infinity, 'Infinity', true, [500]].forEach(function (amount) {
    var db = khata();

    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false, String(amount));
    assert.deepEqual(db, khata());
  });
});


test('a finite settlement that would overflow the ledger leaves it unchanged', function () {
  var db = khata();
  db.customers[0].totalSettled = 1e308;
  var before = JSON.stringify(db);

  assert.deepEqual(ledger.recordSettlement(db, 1, 1e308), {
    ok: false,
    error: 'Settlement exceeds ledger limits'
  });
  assert.equal(JSON.stringify(db), before);
});
