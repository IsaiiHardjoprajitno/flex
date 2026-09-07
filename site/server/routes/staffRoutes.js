/**
 * Staff Routes
 * GET  /api/staff - Fetch all active staff
 * POST /api/staff - Add a new staff member
 */

const express = require('express');
const router = express.Router();
const { getStaff, createStaff } = require('../controllers/staffController');

router.get('/', getStaff);
router.post('/', createStaff);

module.exports = router;
