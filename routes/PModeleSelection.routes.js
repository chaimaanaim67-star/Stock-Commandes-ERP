const express = require('express');

const router = express.Router();

const controller =
    require('../controllers/PModeleSelection.controller');

// =====================================================
// GET
// =====================================================

router.get(
    '/:id_modele',
    controller.getSelections
);

// =====================================================
// ADD
// =====================================================

router.post(
    '/',
    controller.addSelection
);

// =====================================================
// DELETE
// =====================================================

router.delete(
    '/:id_selection',
    controller.deleteSelection
);

// =====================================================
// REPLACE
// =====================================================

router.put(
    '/replace/:id_modele',
    controller.replaceSelections
);

module.exports = router;