/**
 * Emergency Contact Routes
 * Handles emergency contact management and setup
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getEmergencyContact,
  createOrUpdateEmergencyContact,
  deleteEmergencyContact,
  hasEmergencyContact
} from '../storage-service/index.js';
import { isEmailAlertsEnabled, getEmailConfigStatus } from '../utils/nodemailerHelper.js';

const router = express.Router();

/**
 * POST /api/emergency/save
 * Save or create emergency contact for a user
 * 
 * Request body:
 * {
 *   "userId": "user-uuid",
 *   "contactName": "John Doe",
 *   "contactEmail": "john@example.com",
 *   "contactPhone": "+1234567890" (optional)
 * }
 */
router.post('/save', asyncHandler(async (req, res) => {
  const { userId, contactName, contactEmail, contactPhone } = req.body;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  if (!contactName || typeof contactName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Contact name is required and must be a string'
    });
  }

  if (!contactEmail || typeof contactEmail !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Contact email is required and must be a string'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  try {
    console.log(`💾 Saving emergency contact for user: ${userId}`);

    const savedContact = await createOrUpdateEmergencyContact(
      userId,
      contactName.trim(),
      contactEmail.trim(),
      contactPhone ? contactPhone.trim() : null
    );

    return res.status(200).json({
      success: true,
      message: 'Emergency contact saved successfully',
      data: savedContact
    });
  } catch (error) {
    console.error('Error saving emergency contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save emergency contact',
      details: error.message
    });
  }
}));

/**
 * GET /api/emergency/:userId
 * Fetch emergency contact for a user
 * 
 * Path params:
 * - userId: User UUID
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    console.log(`📋 Fetching emergency contact for user: ${userId}`);

    const contact = await getEmergencyContact(userId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'No emergency contact found for this user'
      });
    }

    return res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching emergency contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency contact',
      details: error.message
    });
  }
}));

/**
 * PUT /api/emergency/update
 * POST /api/emergency/update (alias for compatibility)
 * Update emergency contact information
 * 
 * Request body:
 * {
 *   "userId": "user-uuid",
 *   "contactName": "Jane Doe",
 *   "contactEmail": "jane@example.com",
 *   "contactPhone": "+1987654321" (optional)
 * }
 */
const updateHandler = asyncHandler(async (req, res) => {
  const { userId, contactName, contactEmail, contactPhone } = req.body;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  if (!contactName || typeof contactName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Contact name is required and must be a string'
    });
  }

  if (!contactEmail || typeof contactEmail !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Contact email is required and must be a string'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  try {
    console.log(`✏️  Updating emergency contact for user: ${userId}`);

    const updatedContact = await createOrUpdateEmergencyContact(
      userId,
      contactName.trim(),
      contactEmail.trim(),
      contactPhone ? contactPhone.trim() : null
    );

    return res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: updatedContact
    });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update emergency contact',
      details: error.message
    });
  }
});

// Support both PUT and POST for update (for backwards compatibility)
router.put('/update', updateHandler);
router.post('/update', updateHandler);

/**
 * GET /api/emergency/check/:userId
 * Check if user has an emergency contact
 * 
 * Path params:
 * - userId: User UUID
 */
router.get('/check/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    console.log(`🔍 Checking emergency contact for user: ${userId}`);

    const hasContact = await hasEmergencyContact(userId);

    return res.status(200).json({
      success: true,
      hasEmergencyContact: hasContact
    });
  } catch (error) {
    console.error('Error checking emergency contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check emergency contact',
      details: error.message
    });
  }
}));

/**
 * DELETE /api/emergency/:userId
 * Delete emergency contact for a user
 * 
 * Path params:
 * - userId: User UUID
 */
router.delete('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    console.log(`🗑️  Deleting emergency contact for user: ${userId}`);

    await deleteEmergencyContact(userId);

    return res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete emergency contact',
      details: error.message
    });
  }
}));

/**
 * GET /api/emergency/email/status
 * Get email service configuration status
 */
router.get('/email/status', asyncHandler(async (req, res) => {
  const emailStatus = getEmailConfigStatus();
  
  return res.status(200).json({
    success: true,
    data: emailStatus,
    message: 'Email service status retrieved successfully'
  });
}));

export default router;
