// /srv/chswebdesignndevelopment/server/api.js
// Route aggregator — each domain lives in its own routes/ file.
const express = require('express');
const router = express.Router();

router.use('/', require('./routes/timeclock'));
router.use('/', require('./routes/gradebook'));
router.use('/', require('./routes/roster'));
router.use('/', require('./routes/payroll'));
router.use('/', require('./routes/notebooks'));
router.use('/', require('./routes/projects'));
router.use('/', require('./routes/assessments'));
router.use('/', require('./routes/calendar'));
router.use('/', require('./routes/files'));

module.exports = router;
