const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sendContactReply } = require('../services/emailService');

// Submit a new contact request
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Create new contact request
    const contact = new Contact({
      firstName,
      lastName,
      email,
      phone: phone || '', // Phone is optional
      message,
      status: 'pending'
    });
    
    await contact.save();
    
    // Send confirmation email to user
    const emailService = require('../services/emailService');
    await emailService.sendContactConfirmation(email, firstName);
    
    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon!',
      contactId: contact._id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit your message. Please try again later.',
      error: error.message
    });
  }
});

// Admin routes - Get all contact requests
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact requests',
      error: error.message
    });
  }
});

// Admin - Get single contact
router.get('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found'
      });
    }
    
    res.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Error fetching contact request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact request',
      error: error.message
    });
  }
});

// Admin - Update contact status
router.patch('/admin/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'replied', 'resolved', 'spam'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found'
      });
    }
    
    // Update fields
    contact.status = status;
    if (adminNotes) {
      contact.adminNotes = adminNotes;
    }
    
    await contact.save();
    
    res.json({
      success: true,
      message: `Contact status updated to ${status}`,
      contact
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact status',
      error: error.message
    });
  }
});

// Admin - Reply to contact
router.post('/admin/:id/reply', adminMiddleware, async (req, res) => {
  try {
    const { replyContent } = req.body;
    
    if (!replyContent) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found'
      });
    }
    
    // Update contact with reply information
    contact.replyContent = replyContent;
    contact.repliedAt = new Date();
    contact.repliedBy = req.user.id;
    contact.status = 'replied';
    
    await contact.save();
    
    // Send the reply email
    const fullName = `${contact.firstName} ${contact.lastName}`;
    await sendContactReply(contact.email, fullName, replyContent);
    
    res.json({
      success: true,
      message: 'Reply sent successfully',
      contact
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
});

// Admin - Delete contact request
router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found'
      });
    }
    
    await Contact.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Contact request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact request',
      error: error.message
    });
  }
});

module.exports = router;
