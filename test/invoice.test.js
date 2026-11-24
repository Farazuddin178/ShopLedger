var test = require('node:test');
var assert = require('node:assert/strict');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

function figures(result) {
  return {
    subtotal: result.subtotal,
    discount: result.discount,
    tax: result.tax,
    cgst: result.cgst,
    sgst: result.sgst,
    total: result.total
  };
}

test('CURRENT BEHAVIOUR: #1001 uses HSN slabs when mixed-slab items have no gstRate', function () {
  var order = {
    id: 1001,
    coupon: '',
    // HSN alone describes the 5% and 12% slabs on these order lines.
    items: [
      { id: 1, name: 'Rice', price: 100, qty: 2, hsn: '1006' },
      { id: 2, name: 'Ghee', price: 100, qty: 1, hsn: '0405' }
    ]
  };

  var billed = pricing.computeTotals(order.items, order.coupon);
  var printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(figures(billed), {
    subtotal: 300, discount: 0, tax: 22, cgst: 11, sgst: 11, total: 322
  });
  assert.deepEqual(figures(printed), {
    subtotal: 300, discount: 0, tax: 22, cgst: 11, sgst: 11, total: 322
  });
  assert.deepEqual(billed.lines.map(line => [line.gstPercent, line.tax]), [[5, 10], [12, 12]]);
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[5, 10], [12, 12]]);
});

test('CURRENT BEHAVIOUR: #1002 applies SAVE10 before GST', function () {
  var order = {
    id: 1002,
    coupon: 'SAVE10',
    items: [{ id: 2, name: 'Ghee', price: 300, qty: 2, hsn: '0405', gstRate: 12 }]
  };

  var billed = pricing.computeTotals(order.items, order.coupon);
  var printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(figures(billed), {
    subtotal: 600, discount: 60, tax: 64.8, cgst: 32.4, sgst: 32.4, total: 604.8
  });
  assert.deepEqual(figures(printed), {
    subtotal: 600, discount: 60, tax: 64.8, cgst: 32.4, sgst: 32.4, total: 604.8
  });
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[12, 64.8]]);
});

test('CURRENT BEHAVIOUR: #1004 applies the SAVE10 cap on a 2240 subtotal', function () {
  var order = {
    id: 1004,
    coupon: 'SAVE10',
    items: [{ id: 1, name: 'Rice', price: 112, qty: 20, hsn: '1006', gstRate: 5 }]
  };

  var billed = pricing.computeTotals(order.items, order.coupon);
  var printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(figures(billed), {
    subtotal: 2240, discount: 150, tax: 104.5, cgst: 52.25, sgst: 52.25, total: 2194.5
  });
  assert.deepEqual(figures(printed), {
    subtotal: 2240, discount: 150, tax: 104.5, cgst: 52.25, sgst: 52.25, total: 2194.5
  });
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[5, 104.5]]);
});

test('CURRENT BEHAVIOUR: #1008 matches billing for all-18% items without a coupon', function () {
  var order = {
    id: 1008,
    coupon: '',
    items: [
      { id: 3, name: 'Tea', price: 100, qty: 2, hsn: '0902' },
      { id: 4, name: 'Coffee', price: 100, qty: 1, hsn: '0901', gstRate: 18 }
    ]
  };

  var billed = pricing.computeTotals(order.items, order.coupon);
  var printed = invoice.computeInvoiceFigures(order);
  var expected = {
    subtotal: 300, discount: 0, tax: 54, cgst: 27, sgst: 27, total: 354
  };

  assert.deepEqual(figures(billed), expected);
  assert.deepEqual(figures(printed), expected);
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[18, 36], [18, 18]]);
});


test('invoice matches checkout for mixed HSN slabs and capped SAVE10', function () {
  var order = {
    coupon: 'SAVE10',
    items: [
      { id: 1, name: 'Rice', price: 100, qty: 20, hsn: '1006' },
      { id: 2, name: 'Ghee', price: 120, qty: 2, hsn: '0405' }
    ]
  };

  var billed = pricing.computeTotals(order.items, order.coupon);
  var printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(figures(billed), {
    subtotal: 2240, discount: 150, tax: 120.17, cgst: 60.09, sgst: 60.08, total: 2210.17
  });
  assert.deepEqual(figures(printed), figures(billed));
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[5, 93.3], [12, 26.87]]);
});
