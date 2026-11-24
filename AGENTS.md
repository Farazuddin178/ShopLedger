# Repository Guidelines

## Project Structure & Module Organization

- `server.js` starts Express, serves `public/`, mounts the routers under `/api`, and serves printable invoices.
- `routes/` contains the product, order, customer, and report routers. Keep HTTP handling there and reusable business logic in `lib/`.
- `public/` contains the browser UI in `index.html`, `js/app.js`, and `css/style.css`.
- `config.js` holds app settings. `lib/store.js` reads and writes the tracked `data/db.json` file.

## Build, Test, and Development Commands

- `npm install` installs the Express and body-parser dependencies.
- `npm start` runs `node server.js`. Open `http://localhost:3000` or set the `PORT` environment variable to use another port.
- `node --check routes/orders.js` checks JavaScript syntax. Substitute the path of each changed JavaScript file.
- `npm test` is a placeholder that exits with status 1. The project has no build or lint script.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, and statement terminators in JavaScript. Match the existing CommonJS style with `require` and `exports` or `module.exports`. Use lowercase module filenames and camelCase function names such as `computeTotals`. Reuse the existing pricing, tax, and storage helpers when changing order behavior.

## Testing Guidelines

The repository has no automated test suite, test naming convention, or coverage target. Check the affected flow in the browser or through the API. For order changes, place an order and verify totals, inventory, and any applicable khata balance. For invoice changes, open the printed invoice and check GST reconciliation. Use a disposable checkout for tests that write to `data/db.json`.

## Commits & Pull Requests

Use short, descriptive lowercase commit subjects, following examples such as `invoice page for accountant`. In the pull request, explain the behavior change and how you verified it. Link the relevant issue if one exists and include screenshots for visible UI changes.

## Current ticket

Current ticket: Order history sorting and date filter are broken, and Khata settlements corrupt customer balances.
Allowed files: lib/orders.js (list only), lib/dates.js, lib/ledger.js, routes/customers.js. Test file: test/orders-ledger.test.js.
