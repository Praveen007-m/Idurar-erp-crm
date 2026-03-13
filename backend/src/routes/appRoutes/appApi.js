const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');

// Staff/Admin controller
const adminController = require('@/controllers/appControllers/adminController');
const checkRole = require('@/middlewares/checkRole');

// =============================
// ADMIN / STAFF ROUTES
// =============================

// List all staff
router.route('/admin/list')
  .get(checkRole(['admin', 'owner']), catchErrors(adminController.listStaff));

// Create staff
router.route('/admin/createStaff')
  .post(checkRole(['admin', 'owner']), catchErrors(adminController.createStaff));

// Update staff
router.route('/admin/updateStaff/:id')
  .patch(checkRole(['admin', 'owner']), catchErrors(adminController.updateStaff));

// Delete staff
router.route('/admin/deleteStaff/:id')
  .delete(checkRole(['admin', 'owner']), catchErrors(adminController.deleteStaff));

// List all staff (for dropdown)
router.route('/admin/listAllStaff')
  .get(checkRole(['admin', 'owner']), catchErrors(adminController.listAllStaff));

// =============================
// DASHBOARD ROUTES
// =============================
const dashboardController = require('@/controllers/appControllers/dashboardController');

router.route('/dashboard/admin')
  .get(catchErrors(dashboardController.adminDashboard));

router.route('/dashboard/staff')
  .get(catchErrors(dashboardController.staffDashboard));

router.route('/reports')
  .get(checkRole(['admin', 'owner', 'staff']), catchErrors(dashboardController.reports));



// =============================
// GENERIC ENTITY ROUTES
// =============================

const routerApp = (entity, controller) => {

  router.route(`/${entity}/create`)
    .post(catchErrors(controller['create']));

  router.route(`/${entity}/read/:id`)
    .get(catchErrors(controller['read']));

  router.route(`/${entity}/update/:id`)
    .patch(catchErrors(controller['update']));

  router.route(`/${entity}/delete/:id`)
    .delete(catchErrors(controller['delete']));

  router.route(`/${entity}/search`)
    .get(catchErrors(controller['search']));

  router.route(`/${entity}/list`)
    .get(catchErrors(controller['list']));

  router.route(`/${entity}/listAll`)
    .get(catchErrors(controller['listAll']));

  router.route(`/${entity}/filter`)
    .get(catchErrors(controller['filter']));

  router.route(`/${entity}/summary`)
    .get(catchErrors(controller['summary']));

  // Invoice / Quote / Payment email
  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`)
      .post(catchErrors(controller['mail']));
  }

  // Quote convert
  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`)
      .get(catchErrors(controller['convert']));
  }

  // Repayment: Add dedicated client-specific endpoint for calendar
  if (entity === 'repayment') {
    router.route(`/${entity}/by-client-date`)
      .get(catchErrors(controller['getByClientAndDate']));

    router.route(`/${entity}/client/:clientId`)
      .get(catchErrors(controller['clientRepayments']));
  }
};

router
  .route('/payment/download/:id')
  .get(catchErrors(appControllers.paymentController.download));

router
  .route('/payments/:id/download')
  .get(catchErrors(appControllers.paymentController.download));

router
  .route('/payment-mode')
  .post(catchErrors(appControllers.paymentModeController.create));

router
  .route('/payment-mode/:id')
  .put(catchErrors(appControllers.paymentModeController.update));


// =============================
// AUTO REGISTER ENTITY ROUTES
// =============================

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

module.exports = router;
