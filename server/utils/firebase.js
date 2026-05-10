const admin = require('firebase-admin')
const serviceAccount = require('../serviceAccountKey.json')

// Khởi tạo ứng dụng Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
})

// lấy đối tượng Firestore và Auth để sử dụng trong các route
const db = admin.firestore()
const auth = admin.auth()

// Xuất các đối tượng để sử dụng trong server.js
module.exports = { admin, db, auth }