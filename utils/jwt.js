const jwt = require('jsonwebtoken');

// Kandkhlo l-config mn .env
const JWT_SECRET = process.env.JWT_SECRET || 'ismawood_secret_key_2026';
const JWT_EXPIRES_IN = '1d'; 



function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };