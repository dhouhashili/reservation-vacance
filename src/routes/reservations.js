const express = require('express');
const pool = require('../db/pool');

const router = express.Router();
const STATUSES = new Set(['Pending', 'Confirmed', 'Paid', 'Cancelled']);

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / 86400000);
}

function validateReservation(body) {
  const required = ['guest_full_name', 'guest_phone', 'guest_email', 'check_in', 'check_out'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === '') {
      return `${field.replaceAll('_', ' ')} is required.`;
    }
  }

  const nights = calculateNights(body.check_in, body.check_out);
  if (!Number.isFinite(nights) || nights < 1) {
    return 'Check-out date must be after check-in date.';
  }

  if (!STATUSES.has(body.status || 'Pending')) {
    return 'Reservation status is invalid.';
  }

  if (toNumber(body.adults) < 1) {
    return 'At least one adult is required.';
  }

  if (toNumber(body.children) < 0 || toNumber(body.total_amount) < 0 || toNumber(body.deposit_paid) < 0) {
    return 'Guest counts and amounts cannot be negative.';
  }

  return null;
}

function normalizeReservation(body) {
  const total = toNumber(body.total_amount);
  const deposit = toNumber(body.deposit_paid);
  return {
    guest_full_name: String(body.guest_full_name).trim(),
    guest_phone: String(body.guest_phone).trim(),
    guest_email: String(body.guest_email).trim(),
    adults: Math.max(1, Math.trunc(toNumber(body.adults) || 1)),
    children: Math.max(0, Math.trunc(toNumber(body.children))),
    check_in: body.check_in,
    check_out: body.check_out,
    nights: calculateNights(body.check_in, body.check_out),
    total_amount: total,
    deposit_paid: deposit,
    remaining_amount: Math.max(0, total - deposit),
    status: body.status || 'Pending',
    notes: body.notes ? String(body.notes).trim() : null
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM reservations ORDER BY check_in ASC, id ASC'
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [[summary]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status <> 'Cancelled' AND YEAR(check_in) = YEAR(CURDATE()) AND MONTH(check_in) = MONTH(CURDATE()) THEN total_amount ELSE 0 END), 0) AS monthly_revenue,
        COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN remaining_amount ELSE 0 END), 0) AS remaining_to_collect,
        COALESCE(SUM(
          CASE
            WHEN status <> 'Cancelled'
              AND check_in < LAST_DAY(CURDATE()) + INTERVAL 1 DAY
              AND check_out > DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE()) - 1 DAY)
            THEN DATEDIFF(
              LEAST(check_out, LAST_DAY(CURDATE()) + INTERVAL 1 DAY),
              GREATEST(check_in, DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE()) - 1 DAY))
            )
            ELSE 0
          END
        ), 0) AS occupied_nights_this_month
      FROM reservations
    `);
    const [upcoming] = await pool.query(`
      SELECT * FROM reservations
      WHERE check_in >= CURDATE() AND status <> 'Cancelled'
      ORDER BY check_in ASC
      LIMIT 6
    `);

    const today = new Date();
    const daysInMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 0).getUTCDate();
    const occupancyRate = Math.min(100, Math.round((Number(summary.occupied_nights_this_month || 0) / daysInMonth) * 100));

    res.json({
      upcoming,
      monthly_revenue: Number(summary.monthly_revenue || 0),
      remaining_to_collect: Number(summary.remaining_to_collect || 0),
      occupancy_rate: occupancyRate
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validationError = validateReservation(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const reservation = normalizeReservation(req.body);
    const [result] = await pool.query('INSERT INTO reservations SET ?', reservation);
    const [[created]] = await pool.query('SELECT * FROM reservations WHERE id = ?', [result.insertId]);
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validationError = validateReservation(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const reservation = normalizeReservation(req.body);
    const [result] = await pool.query('UPDATE reservations SET ? WHERE id = ?', [reservation, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Reservation not found.' });

    const [[updated]] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Reservation not found.' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
