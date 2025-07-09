// Notification service utility
// Integrate with SMS/email/push providers as needed
const Notification = require('../modules/feedback/notification.model');
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
let twilioClient = null;
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

async function sendSMS(to, message) {
  if (!twilioClient) throw new Error('Twilio not configured');
  return twilioClient.messages.create({
    body: message,
    from: twilioPhone,
    to,
  });
}

async function sendNotification({ user, type, message, relatedWash, relatedFeedback, phone }) {
  // For now, just log the notification
  console.log(`Send notification to user ${user}: [${type}] ${message}`);
  // Save to Notification model
  await Notification.create({ user, type, message, relatedWash, relatedFeedback });
  // Send SMS for OTP or important notifications
  if (type === 'otp' && phone) {
    try {
      await sendSMS(phone, message);
    } catch (err) {
      console.error('Failed to send SMS:', err.message);
    }
  }
}

module.exports = { sendNotification, sendSMS }; 