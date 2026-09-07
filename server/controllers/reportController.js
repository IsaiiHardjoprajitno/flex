/**
 * Report Controller
 * Handles GET /api/reports/daily and GET /api/reports/summary
 */

const db = require('../db');

/**
 * GET /api/reports/daily?date=YYYY-MM-DD
 * Retrieve aggregated logs for a given date:
 *   - Team names, assigned members, total installs, and troubleshoot counts.
 */
const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "date" is required (YYYY-MM-DD).',
      });
    }

    // Get teams with their work logs for the date
    const teamsResult = await db.query(
      `SELECT t.id AS team_id, t.team_name, t.work_date,
              COALESCE(dwl.installations_count, 0) AS installations_count,
              COALESCE(dwl.troubleshoot_count, 0) AS troubleshoot_count,
              dwl.notes
       FROM teams t
       LEFT JOIN daily_work_logs dwl ON t.id = dwl.team_id
       WHERE t.work_date = $1
       ORDER BY t.team_name ASC`,
      [date]
    );

    // For each team, get assigned members
    const teams = [];
    for (const team of teamsResult.rows) {
      const membersResult = await db.query(
        `SELECT u.id, u.name, u.role
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY u.name ASC`,
        [team.team_id]
      );

      teams.push({
        ...team,
        members: membersResult.rows,
      });
    }

    // Calculate totals
    const totalInstalls = teams.reduce((sum, t) => sum + Number(t.installations_count), 0);
    const totalTroubleshoots = teams.reduce((sum, t) => sum + Number(t.troubleshoot_count), 0);

    res.json({
      success: true,
      data: {
        date,
        total_installations: totalInstalls,
        total_troubleshoots: totalTroubleshoots,
        teams,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/summary?timeframe=daily|weekly|monthly
 * Get aggregated installation and troubleshoot totals per team
 * over daily, weekly, and monthly intervals.
 */
const getSummaryReport = async (req, res, next) => {
  try {
    const { timeframe = 'daily' } = req.query;

    let dateCondition;
    switch (timeframe) {
      case 'daily':
        dateCondition = `t.work_date = CURRENT_DATE`;
        break;
      case 'weekly':
        dateCondition = `t.work_date >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case 'monthly':
        dateCondition = `t.work_date >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'timeframe must be one of: daily, weekly, monthly',
        });
    }

    const result = await db.query(
      `SELECT t.team_name,
              COUNT(DISTINCT t.work_date) AS active_days,
              SUM(COALESCE(dwl.installations_count, 0)) AS total_installations,
              SUM(COALESCE(dwl.troubleshoot_count, 0)) AS total_troubleshoots,
              ROUND(AVG(COALESCE(dwl.installations_count, 0)), 1) AS avg_installations_per_day,
              ROUND(AVG(COALESCE(dwl.troubleshoot_count, 0)), 1) AS avg_troubleshoots_per_day
       FROM teams t
       LEFT JOIN daily_work_logs dwl ON t.id = dwl.team_id
       WHERE ${dateCondition}
       GROUP BY t.team_name
       ORDER BY total_installations DESC`
    );

    // Grand totals
    const grandInstalls = result.rows.reduce((s, r) => s + Number(r.total_installations), 0);
    const grandTroubles = result.rows.reduce((s, r) => s + Number(r.total_troubleshoots), 0);

    res.json({
      success: true,
      data: {
        timeframe,
        grand_total_installations: grandInstalls,
        grand_total_troubleshoots: grandTroubles,
        teams: result.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDailyReport,
  getSummaryReport,
};
