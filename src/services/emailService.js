const nodemailer = require('nodemailer');

// Log email configuration with redacted password
console.log('Email Service Configuration:');
console.log('- Host:', process.env.EMAIL_HOST || 'Not set, using default');
console.log('- Port:', process.env.EMAIL_PORT || 'Not set, using default');
console.log('- User:', process.env.EMAIL_USER || 'Not set, using default');
console.log('- From:', process.env.EMAIL_FROM || 'Not set, using default');

// Create a transporter for sending real emails
const createMailTransporter = () => {
  // Use Gmail for simplicity
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'imrajesh2005@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

/**
 * Send OTP verification email
 * @param {string} to - Recipient email address
 * @param {string} otp - One-time password code
 * @param {string} purpose - Purpose of OTP (e.g., 'password_reset', 'admin_login')
 */
const sendOTPEmail = async (to, otp, purpose = 'verification') => {
  try {
    // Always send admin OTPs to the configured admin email
    const finalRecipient = purpose === 'admin_login' 
      ? (process.env.ADMIN_EMAIL || 'imrajesh2005@gmail.com')
      : to;
    
    console.log(`Sending OTP to ${finalRecipient} for ${purpose}`);
    
    // Create the transporter
    const transporter = createMailTransporter();
    
    // Set up email data based on purpose
    let subject, text, html;
    
    if (purpose === 'password_reset') {
      subject = 'Password Reset OTP - Gym Management System';
      text = `Your OTP for password reset is: ${otp}. This code will expire in 10 minutes.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4338CA;">Password Reset Verification</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your Gym Management account.</p>
          <p>Please use the following OTP code to verify your request:</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #4F46E5; padding: 15px; background-color: #EEF2FF; border-radius: 4px;">
              ${otp}
            </div>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #6B7280; font-size: 14px;">Gym Management System</p>
        </div>
      `;
    } else if (purpose === 'admin_login') {
      subject = 'Admin Login Verification - Gym Management System';
      text = `Your OTP for admin login is: ${otp}. This code will expire in 10 minutes.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4338CA;">Admin Login Verification</h2>
          <p>Hello Admin,</p>
          <p>We received a login request for your admin account.</p>
          <p>Please use the following OTP code to verify your identity:</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #4F46E5; padding: 15px; background-color: #EEF2FF; border-radius: 4px;">
              ${otp}
            </div>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not attempt to login, please secure your account immediately.</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #6B7280; font-size: 14px;">Gym Management System</p>
        </div>
      `;
    } else {
      subject = 'Verification Code - Gym Management System';
      text = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4338CA;">Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="margin: 30px 0; text-align: center;">
            <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #4F46E5; padding: 15px; background-color: #EEF2FF; border-radius: 4px;">
              ${otp}
            </div>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #6B7280; font-size: 14px;">Gym Management System</p>
        </div>
      `;
    }
    
    // Setup email data
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gymmanagement.com',
      to: finalRecipient,
      subject,
      text,
      html
    };
    
    // In development mode, just log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('==== Development Mode: Email Content ====');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`OTP: ${otp}`);
      console.log('=======================================');
      
      // For testing purposes, still try to send if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent in development mode:', info.messageId);
        return info;
      }
      
      return { messageId: 'dev-mode-email', success: true };
    }
    
    // Send the email in production mode
    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${finalRecipient}:`, info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { error: true, message: error.message };
  }
};

/**
 * Send confirmation email to user after contact form submission
 * @param {string} to - Recipient email address
 * @param {string} firstName - Recipient's first name
 */
const sendContactConfirmation = async (to, firstName) => {
  try {
    console.log(`Sending contact confirmation to ${to}`);
    
    // Create the transporter
    const transporter = createMailTransporter();
    
    // Email content
    const subject = 'We Received Your Message - PlatinumGym';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #9eb82a;">Thank You for Contacting Us!</h2>
        <p>Hello ${firstName},</p>
        <p>We've received your message and appreciate you taking the time to reach out to PlatinumGym.</p>
        <p>Our team will review your inquiry and get back to you as soon as possible, usually within 24-48 hours.</p>
        <div style="margin: 30px 0; text-align: center;">
          <div style="padding: 15px; background-color: #EEF2FF; border-radius: 4px;">
            <p>If you have any urgent concerns, please call us at <strong>+1 (555) 123-4567</strong>.</p>
          </div>
        </div>
        <p>We look forward to assisting you!</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #6B7280; font-size: 14px;">PlatinumGym Team</p>
      </div>
    `;
    
    // Setup email data
    const mailOptions = {
      from: `"PlatinumGym" <${process.env.EMAIL_FROM || 'noreply@gymmanagement.com'}>`,
      to,
      subject,
      html
    };
    
    // In development mode, just log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('==== Development Mode: Contact Confirmation Email ====');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('=======================================');
      
      // For testing purposes, still try to send if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const info = await transporter.sendMail(mailOptions);
        console.log('Contact confirmation email sent in development mode:', info.messageId);
        return info;
      }
      
      return { messageId: 'dev-mode-email', success: true };
    }
    
    // Send the email in production mode
    const info = await transporter.sendMail(mailOptions);
    console.log(`Contact confirmation email sent to ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending contact confirmation email:', error);
    return { error: true, message: error.message };
  }
};

/**
 * Send admin reply to a contact form submission
 * @param {string} to - User's email address
 * @param {string} name - User's full name
 * @param {string} replyContent - Admin reply content
 */
const sendContactReply = async (to, name, replyContent) => {
  try {
    console.log(`Sending contact reply to ${to}`);
    
    // Create the transporter
    const transporter = createMailTransporter();
    
    // Email content
    const subject = 'Response to Your Inquiry - PlatinumGym';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #9eb82a;">Our Response to Your Inquiry</h2>
        <p>Hello ${name},</p>
        <p>Thank you for contacting PlatinumGym. Here's our response to your inquiry:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f7fafc; border-left: 4px solid #9eb82a; border-radius: 4px;">
          ${replyContent.replace(/\n/g, '<br>')}
        </div>
        <p>If you have any further questions or need additional information, please don't hesitate to reply to this email or contact us directly.</p>
        <p>We're here to help!</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #6B7280; font-size: 14px;">PlatinumGym Team</p>
        <p style="color: #6B7280; font-size: 12px;">123 Fitness Street, Gym City, GC 12345<br>+1 (555) 123-4567<br>info@gymmanagement.com</p>
      </div>
    `;
    
    // Setup email data
    const mailOptions = {
      from: `"PlatinumGym" <${process.env.EMAIL_FROM || 'info@gymmanagement.com'}>`,
      to,
      subject,
      html
    };
    
    // In development mode, just log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('==== Development Mode: Contact Reply Email ====');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Reply Content: ${replyContent}`);
      console.log('=======================================');
      
      // For testing purposes, still try to send if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const info = await transporter.sendMail(mailOptions);
        console.log('Contact reply email sent in development mode:', info.messageId);
        return info;
      }
      
      return { messageId: 'dev-mode-email', success: true };
    }
    
    // Send the email in production mode
    const info = await transporter.sendMail(mailOptions);
    console.log(`Contact reply email sent to ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending contact reply email:', error);
    return { error: true, message: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendContactConfirmation,
  sendContactReply
};
