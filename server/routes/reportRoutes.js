/**
 * Report Routes
 * GET /api/reports/daily    - Daily aggregated report
 * GET /api/reports/summary  - Summary report (daily/weekly/monthly)
 */

const express = require('express');
const router = express.Router();
const { getDailyReport, getSummaryReport } = require('../controllers/reportController');

router.get('/daily', getDailyReport);
router.get('/summary', getSummaryReport);

module.exports = router;
