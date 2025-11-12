const { User, CorporateContact, UserContact } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all corporate contacts (company directory)
 */
async function getAllCorporateContacts() {
  const contacts = await CorporateContact.findAll({
    where: { is_active: true },
    attributes: ['id', 'name', 'phone_number', 'email', 'department', 'job_title', 'profile_pic'],
    order: [['name', 'ASC']]
  });

  return contacts;
}

/**
 * Match phone numbers with corporate contacts
 * Takes array of phone numbers from device, returns matched corporate contacts
 */
async function matchPhoneNumbers(phoneNumbers) {
  console.log('📱 Matching phone numbers:', phoneNumbers.length, 'device contacts');
  
  // Normalize phone numbers (remove +, spaces, dashes, parentheses, etc)
  const normalizedPhones = phoneNumbers.map(phone => 
    phone.replace(/[\s\-\(\)\+]/g, '')
  );

  console.log('🔍 First 5 normalized numbers:', normalizedPhones.slice(0, 5));

  // Get all active corporate contacts
  const allCorporateContacts = await CorporateContact.findAll({
    where: { is_active: true },
    attributes: ['id', 'name', 'phone_number', 'email', 'department', 'job_title', 'profile_pic']
  });

  console.log('👥 Total corporate contacts:', allCorporateContacts.length);

  // Match by comparing normalized phone numbers
  const matches = allCorporateContacts.filter(contact => {
    const normalizedCorporatePhone = contact.phone_number.replace(/[\s\-\(\)\+]/g, '');
    
    // Check if any device number matches (exact match or contains)
    return normalizedPhones.some(devicePhone => {
      // Try exact match
      if (normalizedCorporatePhone === devicePhone) return true;
      
      // Try if one contains the other (handles different country code formats)
      if (normalizedCorporatePhone.includes(devicePhone) || devicePhone.includes(normalizedCorporatePhone)) {
        // Must match at least last 10 digits to avoid false positives
        const minLength = 10;
        const corpSuffix = normalizedCorporatePhone.slice(-minLength);
        const deviceSuffix = devicePhone.slice(-minLength);
        return corpSuffix === deviceSuffix;
      }
      
      return false;
    });
  });

  console.log('✅ Found matches:', matches.length);
  if (matches.length > 0) {
    console.log('📋 Matched contacts:', matches.map(m => `${m.name} (${m.phone_number})`));
  }

  return matches;
}

/**
 * Get user's added contacts (from user_contacts table)
 */
async function getUserContacts(userId) {
  const userContacts = await UserContact.findAll({
    where: { user_id: userId },
    include: [{
      model: CorporateContact,
      as: 'corporateContact',
      attributes: ['id', 'name', 'phone_number', 'email', 'department', 'job_title', 'profile_pic']
    }],
    order: [['added_at', 'DESC']]
  });

  return userContacts.map(uc => ({
    id: uc.id,
    added_at: uc.added_at,
    ...uc.corporateContact.toJSON()
  }));
}

/**
 * Add corporate contact to user's contact list
 */
async function addContactToUser(userId, corporateContactId) {
  // Check if corporate contact exists
  const corporateContact = await CorporateContact.findByPk(corporateContactId);
  if (!corporateContact) {
    throw new Error('Corporate contact not found');
  }

  // Check if already added
  const existing = await UserContact.findOne({
    where: {
      user_id: userId,
      corporate_contact_id: corporateContactId
    }
  });

  if (existing) {
    return { alreadyExists: true, contact: existing };
  }

  // Add to user's contacts
  const userContact = await UserContact.create({
    user_id: userId,
    corporate_contact_id: corporateContactId
  });

  // Return with corporate contact details
  const result = await UserContact.findByPk(userContact.id, {
    include: [{
      model: CorporateContact,
      as: 'corporateContact',
      attributes: ['id', 'name', 'phone_number', 'email', 'department', 'job_title', 'profile_pic']
    }]
  });

  return { alreadyExists: false, contact: result };
}

/**
 * Add multiple corporate contacts to user's contact list
 */
async function addBulkContacts(userId, corporateContactIds) {
  const results = {
    added: [],
    existing: [],
    failed: []
  };

  for (const contactId of corporateContactIds) {
    try {
      const result = await addContactToUser(userId, contactId);
      
      if (result.alreadyExists) {
        results.existing.push(result.contact);
      } else {
        results.added.push(result.contact);
      }
    } catch (error) {
      results.failed.push({
        corporate_contact_id: contactId,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Remove contact from user's list
 */
async function removeContactFromUser(userId, corporateContactId) {
  const deleted = await UserContact.destroy({
    where: {
      user_id: userId,
      corporate_contact_id: corporateContactId
    }
  });

  return deleted > 0;
}

module.exports = {
  getAllCorporateContacts,
  matchPhoneNumbers,
  getUserContacts,
  addContactToUser,
  addBulkContacts,
  removeContactFromUser
};
