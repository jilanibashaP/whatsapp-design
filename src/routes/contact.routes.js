const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const authenticateToken = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/contacts/corporate
 * Get all corporate contacts (company directory)
 */
router.get('/corporate', contactController.getCorporateContacts);

/**
 * POST /api/contacts/match
 * Match device phone numbers with corporate contacts
 * Body: { phone_numbers: ["+1234567890", ...] }
 */
router.post('/match', contactController.matchContacts);

/**
 * GET /api/contacts
 * Get user's added contacts
 */
router.get('/', contactController.getUserContacts);

/**
 * POST /api/contacts
 * Add corporate contact to user's list
 * Body: { corporate_contact_id }
 */
router.post('/', contactController.addContact);

/**
 * POST /api/contacts/bulk
 * Add multiple corporate contacts to user's list
 * Body: { corporate_contact_ids: [1, 2, 3] }
 */
router.post('/bulk', contactController.addBulkContacts);

/**
 * DELETE /api/contacts/:corporateContactId
 * Remove contact from user's list
 */
router.delete('/:corporateContactId', contactController.removeContact);

module.exports = router;
