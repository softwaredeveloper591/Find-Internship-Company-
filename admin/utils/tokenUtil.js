const crypto = require('crypto');

const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex'); // 64-char secure token
};

module.exports = { generateSecureToken };