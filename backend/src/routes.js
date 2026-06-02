import express from 'express';
import { query } from './db.js';
import { ApiError, asyncHandler } from './errors.js';
import { validateContactInput, validateCustomerInput, validateDealInput } from './validation.js';

const router = express.Router();

function firstRow(result, entity) {
  if (result.rowCount === 0) {
    throw new ApiError(404, `${entity} not found`);
  }
  return result.rows[0];
}

function normalizeDeal(row) {
  return row ? { ...row, amount: Number(row.amount) } : row;
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT
      (SELECT count(*)::int FROM customers) AS customer_count,
      (SELECT count(*)::int FROM contacts) AS contact_count,
      (SELECT count(*)::int FROM deals) AS deal_count,
      (SELECT coalesce(sum(amount), 0)::numeric FROM deals) AS deal_amount_total
  `);
  const row = result.rows[0];
  res.json({
    customer_count: row.customer_count,
    contact_count: row.contact_count,
    deal_count: row.deal_count,
    deal_amount_total: Number(row.deal_amount_total)
  });
}));

router.get('/customers', asyncHandler(async (req, res) => {
  const search = (req.query.search || '').toString().trim();
  const result = search
    ? await query(
        `SELECT * FROM customers
         WHERE name ILIKE $1 OR industry ILIKE $1 OR notes ILIKE $1
         ORDER BY updated_at DESC`,
        [`%${search}%`]
      )
    : await query('SELECT * FROM customers ORDER BY updated_at DESC');
  res.json({ items: result.rows });
}));

router.post('/customers', asyncHandler(async (req, res) => {
  const input = validateCustomerInput(req.body);
  const result = await query(
    `INSERT INTO customers (name, industry, website, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.name, input.industry, input.website, input.notes]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/customers/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  res.json(firstRow(result, 'Customer'));
}));

router.put('/customers/:id', asyncHandler(async (req, res) => {
  const input = validateCustomerInput(req.body);
  const result = await query(
    `UPDATE customers SET name = $2, industry = $3, website = $4, notes = $5
     WHERE id = $1
     RETURNING *`,
    [req.params.id, input.name, input.industry, input.website, input.notes]
  );
  res.json(firstRow(result, 'Customer'));
}));

router.delete('/customers/:id', asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM customers WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Customer not found');
  }
  res.status(204).send();
}));

router.get('/contacts', asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.customerId) {
    params.push(req.query.customerId);
    where = 'WHERE c.customer_id = $1';
  }
  const result = await query(
    `SELECT c.*, customers.name AS customer_name
     FROM contacts c
     JOIN customers ON customers.id = c.customer_id
     ${where}
     ORDER BY c.updated_at DESC`,
    params
  );
  res.json({ items: result.rows });
}));

router.post('/contacts', asyncHandler(async (req, res) => {
  const input = validateContactInput(req.body);
  const result = await query(
    `INSERT INTO contacts (customer_id, first_name, last_name, email, phone, title)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.customer_id, input.first_name, input.last_name, input.email, input.phone, input.title]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/contacts/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
  res.json(firstRow(result, 'Contact'));
}));

router.put('/contacts/:id', asyncHandler(async (req, res) => {
  const input = validateContactInput(req.body);
  const result = await query(
    `UPDATE contacts
     SET customer_id = $2, first_name = $3, last_name = $4, email = $5, phone = $6, title = $7
     WHERE id = $1
     RETURNING *`,
    [req.params.id, input.customer_id, input.first_name, input.last_name, input.email, input.phone, input.title]
  );
  res.json(firstRow(result, 'Contact'));
}));

router.delete('/contacts/:id', asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Contact not found');
  }
  res.status(204).send();
}));

router.get('/deals', asyncHandler(async (req, res) => {
  const clauses = [];
  const params = [];
  if (req.query.customerId) {
    params.push(req.query.customerId);
    clauses.push(`d.customer_id = $${params.length}`);
  }
  if (req.query.stage) {
    params.push(req.query.stage);
    clauses.push(`d.stage = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(
    `SELECT d.*, customers.name AS customer_name
     FROM deals d
     JOIN customers ON customers.id = d.customer_id
     ${where}
     ORDER BY d.updated_at DESC`,
    params
  );
  res.json({ items: result.rows.map(normalizeDeal) });
}));

router.post('/deals', asyncHandler(async (req, res) => {
  const input = validateDealInput(req.body);
  const result = await query(
    `INSERT INTO deals (customer_id, name, amount, stage, close_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.customer_id, input.name, input.amount, input.stage, input.close_date, input.notes]
  );
  res.status(201).json(normalizeDeal(result.rows[0]));
}));

router.get('/deals/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM deals WHERE id = $1', [req.params.id]);
  res.json(normalizeDeal(firstRow(result, 'Deal')));
}));

router.put('/deals/:id', asyncHandler(async (req, res) => {
  const input = validateDealInput(req.body);
  const result = await query(
    `UPDATE deals
     SET customer_id = $2, name = $3, amount = $4, stage = $5, close_date = $6, notes = $7
     WHERE id = $1
     RETURNING *`,
    [req.params.id, input.customer_id, input.name, input.amount, input.stage, input.close_date, input.notes]
  );
  res.json(normalizeDeal(firstRow(result, 'Deal')));
}));

router.delete('/deals/:id', asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM deals WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Deal not found');
  }
  res.status(204).send();
}));

export default router;
