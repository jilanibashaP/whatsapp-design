const contactService = require('../services/contact.service');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all corporate contacts (company directory)
 * GET /api/contacts/corporate
 */
async function getCorporateContacts(req, res) {
  try {
    const contacts = await contactService.getAllCorporateContacts();
    return successResponse(res, { contacts }, 'Corporate contacts retrieved successfully');
  } catch (error) {
    console.error('Error getting corporate contacts:', error);
    return errorResponse(res, 'Failed to retrieve corporate contacts', 500);
  }
}

/**
 * Match device phone numbers with corporate contacts
 * POST /api/contacts/match
 * Body: { phone_numbers: ["+1234567890", ...] }
 */
async function matchContacts(req, res) {
  try {
    const { phone_numbers } = req.body;

    if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return errorResponse(res, 'phone_numbers must be a non-empty array', 400);
    }

    const matches = await contactService.matchPhoneNumbers(phone_numbers);
    return successResponse(res, { matches }, `Found ${matches.length} matches`);
  } catch (error) {
    console.error('Error matching contacts:', error);
    return errorResponse(res, 'Failed to match contacts', 500);
  }
}

/**
 * Get user's added contacts
 * GET /api/contacts
 */
async function getUserContacts(req, res) {
  try {
    const userId = req.user.id;
    const contacts = await contactService.getUserContacts(userId);

    return successResponse(res, { contacts }, 'User contacts retrieved successfully');
  } catch (error) {
    console.error('Error getting user contacts:', error);
    return errorResponse(res, 'Failed to retrieve user contacts', 500);
  }
}

/**
 * Add corporate contact to user's list
 * POST /api/contacts
 * Body: { corporate_contact_id }
 */
async function addContact(req, res) {
  try {
    const userId = req.user.id;
    const { corporate_contact_id } = req.body;

    if (!corporate_contact_id) {
      return errorResponse(res, 'corporate_contact_id is required', 400);
    }

    const result = await contactService.addContactToUser(userId, corporate_contact_id);

    if (result.alreadyExists) {
      return successResponse(res, { contact: result.contact }, 'Contact already in your list');
    }

    return successResponse(res, { contact: result.contact }, 'Contact added successfully', 201);
  } catch (error) {
    console.error('Error adding contact:', error);
    if (error.message === 'Corporate contact not found') {
      return errorResponse(res, error.message, 404);
    }
    if (error.message === 'This contact is not on Synapse yet') {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to add contact', 500);
  }
}

/**
 * Add multiple corporate contacts to user's list
 * POST /api/contacts/bulk
 * Body: { corporate_contact_ids: [1, 2, 3] }
 */
async function addBulkContacts(req, res) {
  try {
    const userId = req.user.id;
    const { corporate_contact_ids } = req.body;

    if (!Array.isArray(corporate_contact_ids) || corporate_contact_ids.length === 0) {
      return errorResponse(res, 'corporate_contact_ids must be a non-empty array', 400);
    }

    const results = await contactService.addBulkContacts(userId, corporate_contact_ids);

    return successResponse(res, results, 'Bulk contact operation completed', 201);
  } catch (error) {
    console.error('Error adding bulk contacts:', error);
    return errorResponse(res, 'Failed to add contacts', 500);
  }
}

/**
 * Remove contact from user's list
 * DELETE /api/contacts/:corporateContactId
 */
async function removeContact(req, res) {
  try {
    const userId = req.user.id;
    const { corporateContactId } = req.params;

    const removed = await contactService.removeContactFromUser(userId, parseInt(corporateContactId));

    if (!removed) {
      return errorResponse(res, 'Contact not found in your list', 404);
    }

    return successResponse(res, null, 'Contact removed successfully');
  } catch (error) {
    console.error('Error removing contact:', error);
    return errorResponse(res, 'Failed to remove contact', 500);
  }
}

module.exports = {
  getCorporateContacts,
  matchContacts,
  getUserContacts,
  addContact,
  addBulkContacts,
  removeContact
};
