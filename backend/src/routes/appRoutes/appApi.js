const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');

// Staff/Admin controller
const adminController = require('@/controllers/appControllers/adminController');


// =============================
// ADMIN / STAFF ROUTES
// =============================

// List all staff
router.route('/admin/list')
  .get(catchErrors(adminController.list));

// Create staff
router.route('/admin/createStaff')
  .post(catchErrors(adminController.createStaff));

// Update staff
router.route('/admin/updateStaff/:id')
  .patch(catchErrors(adminController.updateStaff));

// Delete staff
router.route('/admin/deleteStaff/:id')
  .delete(catchErrors(adminController.deleteStaff));

// List all staff (for dropdown)
router.route('/admin/listAllStaff')
  .get(catchErrors(adminController.listAllStaff));


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
};


// =============================
// AUTO REGISTER ENTITY ROUTES
// =============================

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

module.exports = router;