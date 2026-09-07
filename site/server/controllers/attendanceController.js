/**
 * Attendance Controller
 * Handles POST /api/attendance (bulk log) and GET /api/attendance
 */

const db = require('../db');

/**
 * POST /api/attendance
 * Bulk log daily attendance for a list of staff.
 * Body: { work_date: string (YYYY-MM-DD), records: [{ user_id: number, status: 'present'|'absent'|'leave' }] }
 */
const bulkLogAttendance = async (req, res, next) => {
  const client = await db.getClient();

  try {
    const { work_date, records } = req.body;

    if (!work_date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'work_date (YYYY-MM-DD) and a non-empty records array are required.',
      });
    }

    const validStatuses = ['present', 'absent', 'leave'];

    await client.query('BEGIN');

    const inserted = [];
    for (const record of records) {
      const { user_id, status } = record;

      if (!user_id || !validStatuses.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Invalid record: user_id=${user_id}, status=${status}. Status must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const result = await client.query(
        `INSERT INTO attendance (user_id, work_date, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, work_date)
         DO UPDATE SET status = EXCLUDED.status
         RETURNING id, user_id, work_date, status`,
        [user_id, work_date, status]
      );

      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/attendance?date=YYYY-MM-DD
 * Retrieve attendance records for a given date.
 */
const getAttendanceByDate = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Query parameter "date" is required (YYYY-MM-DD).' });
    }

    const result = await db.query(
      `SELECT a.id, a.user_id, u.name AS user_name, u.role,
              a.work_date, a.status
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.work_date = $1
       ORDER BY u.name ASC`,
      [date]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bulkLogAttendance,
  getAttendanceByDate,
};
