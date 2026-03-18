/**
 * analyticsRoutes.js  —  Webaac Solutions Finance Management
 *
 * Place:  backend/src/routes/appRoutes/analyticsRoutes.js
 *
 * Then add ONE line to backend/src/routes/appRoutes/appApi.js:
 *   const analyticsRoutes = require('./analyticsRoutes');
 *   app.use(analyticsRoutes);          // or however appApi exports/uses routes
 *
 * OR — if appApi.js uses an array pattern — just add:
 *   require('./analyticsRoutes')(app);
 *
 * See mounting instructions at the bottom of this file.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../../controllers/appControllers/analyticsController');

// All routes are already protected by adminAuth.isValidAuthToken
// which is applied in app.js before erpApiRouter

router.get('/analytics/reports',             controller.reports);
router.get('/analytics/global-summary',      controller.globalSummary);
router.get('/analytics/performance',         controller.performance);
router.get('/analytics/staff-dashboard',     controller.staffDashboard);
router.get('/analytics/performance-summary', controller.performanceSummary);

module.exports = router;

/*
 ═══════════════════════════════════════════════════════════════════════════════
  HOW TO MOUNT IN YOUR PROJECT
 ═══════════════════════════════════════════════════════════════════════════════

 Open:  backend/src/routes/appRoutes/appApi.js

 At the TOP of the file, add:
   const analyticsRoutes = require('./analyticsRoutes');

 Then find the line where appApi exports or registers routes.
 It will look like one of these patterns:

 PATTERN A — router object:
   const router = express.Router();
   ...
   router.use(analyticsRoutes);        // ← add this
   module.exports = router;

 PATTERN B — app passed in as argument:
   module.exports = (app) => {
     ...
     app.use('/api', analyticsRoutes);  // ← add this
   };

 PATTERN C — array of route files:
   const routes = [
     require('./someOtherRoute'),
     require('./analyticsRoutes'),      // ← add this
   ];

 If you're unsure, paste the contents of your appApi.js here and I'll tell
 you exactly where to add the one line.
 ═══════════════════════════════════════════════════════════════════════════════
*/