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
router.use('/', require('./routes/intervention'));
router.use('/', require('./routes/gallery'));
router.use('/', require('./routes/rank'));
router.use('/', require('./routes/paystubs'));
router.use('/', require('./routes/stickers'));
router.use('/', require('./routes/polls'));
router.use('/', require('./routes/wordcloud'));

module.exports = router;
