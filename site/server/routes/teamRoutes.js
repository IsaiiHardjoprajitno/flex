/**
 * Team Routes
 * POST /api/teams/daily-log - Transactional daily team + members + work log creation
 */

const express = require('express');
const router = express.Router();
const { createDailyTeamLog } = require('../controllers/teamController');

router.post('/daily-log', createDailyTeamLog);

module.exports = router;
