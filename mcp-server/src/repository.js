import { query } from './db.js';

function normalizeDeal(row) {
  return row ? { ...row, amount: Number(row.amount) } : row;
}

export async function listCustomers({ search = '' }) {
  const term = search.trim();
  const result = term
    ? await query(
        `SELECT * FROM customers
         WHERE name ILIKE $1 OR industry ILIKE $1 OR notes ILIKE $1
         ORDER BY updated_at DESC`,
        [`%${term}%`]
      )
    : await query('SELECT * FROM customers ORDER BY updated_at DESC');
  return result.rows;
}

export async function getCustomer({ id }) {
  const customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
  if (customerResult.rowCount === 0) {
    throw new Error('Customer not found');
  }
  const [contactsResult, dealsResult] = await Promise.all([
    query('SELECT * FROM contacts WHERE customer_id = $1 ORDER BY updated_at DESC', [id]),
    query('SELECT * FROM deals WHERE customer_id = $1 ORDER BY updated_at DESC', [id])
  ]);
  return {
    ...customerResult.rows[0],
    contacts: contactsResult.rows,
    deals: dealsResult.rows.map(normalizeDeal)
  };
}

export async function createCustomer(input) {
  const result = await query(
    `INSERT INTO customers (name, industry, website, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.name, input.industry || null, input.website || null, input.notes || null]
  );
  return result.rows[0];
}

export async function updateCustomer(input) {
  const result = await query(
    `UPDATE customers
     SET name = $2, industry = $3, website = $4, notes = $5
     WHERE id = $1
     RETURNING *`,
    [input.id, input.name, input.industry || null, input.website || null, input.notes || null]
  );
  if (result.rowCount === 0) {
    throw new Error('Customer not found');
  }
  return result.rows[0];
}

export async function listContacts({ customer_id = '' }) {
  const result = customer_id
    ? await query(
        `SELECT c.*, customers.name AS customer_name
         FROM contacts c JOIN customers ON customers.id = c.customer_id
         WHERE c.customer_id = $1 ORDER BY c.updated_at DESC`,
        [customer_id]
      )
    : await query(
        `SELECT c.*, customers.name AS customer_name
         FROM contacts c JOIN customers ON customers.id = c.customer_id
         ORDER BY c.updated_at DESC`
      );
  return result.rows;
}

export async function createContact(input) {
  const result = await query(
    `INSERT INTO contacts (customer_id, first_name, last_name, email, phone, title)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.customer_id, input.first_name, input.last_name, input.email || null, input.phone || null, input.title || null]
  );
  return result.rows[0];
}

export async function listDeals({ customer_id = '', stage = '' }) {
  const clauses = [];
  const params = [];
  if (customer_id) {
    params.push(customer_id);
    clauses.push(`d.customer_id = $${params.length}`);
  }
  if (stage) {
    params.push(stage);
    clauses.push(`d.stage = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(
    `SELECT d.*, customers.name AS customer_name
     FROM deals d JOIN customers ON customers.id = d.customer_id
     ${where}
     ORDER BY d.updated_at DESC`,
    params
  );
  return result.rows.map(normalizeDeal);
}

export async function createDeal(input) {
  const result = await query(
    `INSERT INTO deals (customer_id, name, amount, stage, close_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.customer_id, input.name, input.amount || 0, input.stage || 'prospecting', input.close_date || null, input.notes || null]
  );
  return normalizeDeal(result.rows[0]);
}

export async function getDashboardSummary() {
  const result = await query(`
    SELECT
      (SELECT count(*)::int FROM customers) AS customer_count,
      (SELECT count(*)::int FROM contacts) AS contact_count,
      (SELECT count(*)::int FROM deals) AS deal_count,
      (SELECT coalesce(sum(amount), 0)::numeric FROM deals) AS deal_amount_total
  `);
  return {
    customer_count: result.rows[0].customer_count,
    contact_count: result.rows[0].contact_count,
    deal_count: result.rows[0].deal_count,
    deal_amount_total: Number(result.rows[0].deal_amount_total)
  };
}
