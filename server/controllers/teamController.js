/**
 * Team Controller
 * Handles POST /api/teams/daily-log (transactional team + members + work log + attendance)
 */

const db = require('../db');

/**
 * POST /api/teams/daily-log
 * Transactional endpoint (BEGIN / COMMIT) that:
 *   1. Creates a record in `teams`.
 *   2. Inserts selected members (3 to 5 staff IDs) into `team_members`.
 *   3. Inserts job counts into `daily_work_logs`.
 *   4. Upserts attendance records for all assigned members as 'present'.
 *
 * Body: {
 *   team_name: string,
 *   work_date: string (YYYY-MM-DD),
 *   member_ids: number[] (3 to 5 user IDs),
 *   installations_count: number,
 *   troubleshoot_count: number,
 *   notes?: string,
 *   attendance?: [{ user_id: number, status: 'present'|'absent'|'leave' }]
 * }
 */
const createDailyTeamLog = async (req, res, next) => {
  const client = await db.getClient();

  try {
    const {
      team_name,
      work_date,
      member_ids,
      installations_count = 0,
      troubleshoot_count = 0,
      notes = '',
      attendance = [],
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!team_name || !work_date) {
      return res.status(400).json({
        success: false,
        error: 'team_name and work_date are required.',
      });
    }

    if (!Array.isArray(member_ids) || member_ids.length < 3 || member_ids.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'member_ids must be an array of 3 to 5 user IDs.',
      });
    }

    // ── BEGIN Transaction ───────────────────────────────────────────────
    await client.query('BEGIN');

    // Step 1: Create team record
    const teamResult = await client.query(
      `INSERT INTO teams (team_name, work_date)
       VALUES ($1, $2)
       RETURNING id, team_name, work_date, created_at`,
      [team_name, work_date]
    );
    const team = teamResult.rows[0];

    // Step 2: Insert team members (3 to 5 staff IDs)
    const memberInserts = [];
    for (const userId of member_ids) {
      const memberResult = await client.query(
        `INSERT INTO team_members (team_id, user_id)
         VALUES ($1, $2)
         RETURNING id, team_id, user_id`,
        [team.id, userId]
      );
      memberInserts.push(memberResult.rows[0]);
    }

    // Step 3: Insert daily work log
    const workLogResult = await client.query(
      `INSERT INTO daily_work_logs (team_id, work_date, installations_count, troubleshoot_count, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, team_id, work_date, installations_count, troubleshoot_count, notes`,
      [team.id, work_date, installations_count, troubleshoot_count, notes]
    );

    // Step 4: Upsert attendance for all assigned members
    const attendanceRecords = [];

    // If explicit attendance array is provided, use it; otherwise mark all as 'present'
    const attendanceInput =
      attendance.length > 0
        ? attendance
        : member_ids.map((uid) => ({ user_id: uid, status: 'present' }));

    for (const record of attendanceInput) {
      const attResult = await client.query(
        `INSERT INTO attendance (user_id, work_date, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, work_date)
         DO UPDATE SET status = EXCLUDED.status
         RETURNING id, user_id, work_date, status`,
        [record.user_id, work_date, record.status]
      );
      attendanceRecords.push(attResult.rows[0]);
    }

    // ── COMMIT Transaction ──────────────────────────────────────────────
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        team,
        members: memberInserts,
        work_log: workLogResult.rows[0],
        attendance: attendanceRecords,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  createDailyTeamLog,
};
