const { User, CorporateContact, UserContact } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all corporate contacts (company directory)
 * Now includes is_on_synapse flag to indicate if contact is registered
 */
async function getAllCorporateContacts() {
  const contacts = await CorporateContact.findAll({
    where: { is_active: true },
    attributes: ['id', 'name', 'phone_number', 'email', 'department', 'job_title', 'profile_pic'],
    order: [['name', 'ASC']]
  });

  // Check which contacts are registered on Synapse (exist in users table)
  const phoneNumbers = contacts.map(c => c.phone_number);
  
  const registeredUsers = await User.findAll({
    where: {
      phone_number: { [Op.in]: phoneNumbers },
      is_verified: true // Only verified users
    },
    attributes: ['phone_number', 'id']
  });

  // Create a map of phone numbers to user IDs for quick lookup
  const registeredPhoneMap = new Map(
    registeredUsers.map(user => [user.phone_number, user.id])
  );

  // Add is_on_synapse flag and synapse_user_id to each contact
  const contactsWithSynapseStatus = contacts.map(contact => ({
    ...contact.toJSON(),
    is_on_synapse: registeredPhoneMap.has(contact.phone_number),
    synapse_user_id: registeredPhoneMap.get(contact.phone_number) || null
  }));

  return contactsWithSynapseStatus;
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
 * Only returns contacts who are registered on Synapse
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

  // Filter to only include contacts who are on Synapse
  const contactsData = userContacts.map(uc => ({
    id: uc.id,
    added_at: uc.added_at,
    corporate_contact_id: uc.corporate_contact_id,
    ...uc.corporateContact.toJSON()
  }));

  // Get phone numbers to check against users table
  const phoneNumbers = contactsData.map(c => c.phone_number);
  
  const registeredUsers = await User.findAll({
    where: {
      phone_number: { [Op.in]: phoneNumbers },
      is_verified: true
    },
    attributes: ['phone_number', 'id', 'name', 'profile_pic', 'about', 'is_online', 'last_seen']
  });

  // Create map for quick lookup
  const userMap = new Map(
    registeredUsers.map(user => [user.phone_number, user])
  );

  // Only return contacts who are on Synapse
  const synapseContacts = contactsData
    .filter(contact => userMap.has(contact.phone_number))
    .map(contact => {
      const synapseUser = userMap.get(contact.phone_number);
      return {
        id: synapseUser.id, // Use Synapse user ID
        corporate_contact_id: contact.corporate_contact_id,
        name: synapseUser.name || contact.name, // Prefer user's registered name
        phone_number: contact.phone_number,
        email: contact.email,
        department: contact.department,
        job_title: contact.job_title,
        profile_pic: synapseUser.profile_pic || contact.profile_pic,
        about: synapseUser.about,
        is_online: synapseUser.is_online,
        last_seen: synapseUser.last_seen,
        added_at: contact.added_at
      };
    });

  return synapseContacts;
}

/**
 * Add corporate contact to user's contact list
 * Only allows adding contacts who are registered on Synapse
 */
async function addContactToUser(userId, corporateContactId) {
  // Check if corporate contact exists
  const corporateContact = await CorporateContact.findByPk(corporateContactId);
  if (!corporateContact) {
    throw new Error('Corporate contact not found');
  }

  // Check if this contact is registered on Synapse
  const synapseUser = await User.findOne({
    where: {
      phone_number: corporateContact.phone_number,
      is_verified: true
    }
  });

  if (!synapseUser) {
    throw new Error('This contact is not on Synapse yet');
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
