// OTP utility
function generateOTP(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

function isOTPValid(user, otp) {
  return user.otp === otp && user.otpExpires > new Date();
}

module.exports = { generateOTP, isOTPValid }; 