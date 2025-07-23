const admin = require('firebase-admin');
const path = require('path');

// Use the correct service account file for Firebase Admin
const serviceAccount = require(path.join(__dirname, 'paypass-5c24f-firebase-adminsdk-fbsvc-5b659d2eb8.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin; 