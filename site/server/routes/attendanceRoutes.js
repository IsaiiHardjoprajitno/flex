/**
 * Attendance Routes
 * POST /api/attendance     - Bulk log daily attendance
 * GET  /api/attendance     - Get attendance by date
 */

const express = require('express');
const router = express.Router();
const { bulkLogAttendance, getAttendanceByDate } = require('../controllers/attendanceController');

router.post('/', bulkLogAttendance);
router.get('/', getAttendanceByDate);

module.exports = router;
