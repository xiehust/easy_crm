import { z } from 'zod';
import { ApiError } from './errors.js';

const nullableText = (max = 255) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? null : value),
    z.string().trim().max(max).nullable()
  );

const nullableDate = z.preprocess(
  (value) => (value === undefined || value === '' ? null : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
);

const customerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  industry: nullableText(160),
  website: nullableText(255),
  notes: nullableText(5000)
});

const contactSchema = z.object({
  customer_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  email: nullableText(255),
  phone: nullableText(80),
  title: nullableText(160)
});

const dealSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  amount: z.coerce.number().min(0).max(999999999999.99).default(0),
  stage: z.enum(['prospecting', 'qualified', 'proposal', 'won', 'lost']).default('prospecting'),
  close_date: nullableDate,
  notes: nullableText(5000)
});

export function parseOrThrow(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.flatten();
    const fields = Object.keys(details.fieldErrors);
    const suffix = fields.length ? `: ${fields.join(', ')}` : '';
    throw new ApiError(400, `Invalid request body${suffix}`, details);
  }
  return result.data;
}

export function validateCustomerInput(input) {
  return parseOrThrow(customerSchema, input);
}

export function validateContactInput(input) {
  return parseOrThrow(contactSchema, input);
}

export function validateDealInput(input) {
  return parseOrThrow(dealSchema, input);
}
