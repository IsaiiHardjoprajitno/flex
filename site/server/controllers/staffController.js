/**
 * Staff Controller
 * Handles GET /api/staff and POST /api/staff
 */

const db = require('../db');

/**
 * GET /api/staff
 * Fetch all active staff members.
 */
const getStaff = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, role, status, created_at
       FROM users
       WHERE status = 'active'
       ORDER BY name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/staff
 * Add a new staff member.
 * Body: { name: string, role: 'admin'|'lead'|'technician', status?: 'active'|'inactive' }
 */
const createStaff = async (req, res, next) => {
  try {
    const { name, role, status = 'active' } = req.body;

    if (!name || !role) {
      return res.status(400).json({ success: false, error: 'Name and role are required.' });
    }

    const validRoles = ['admin', 'lead', 'technician'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const result = await db.query(
      `INSERT INTO users (name, role, status)
       VALUES ($1, $2, $3)
       RETURNING id, name, role, status, created_at`,
      [name, role, status]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStaff,
  createStaff,
};
