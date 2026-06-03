const bcrypt = require('bcryptjs');

const hashPassword = async (Password) => {
    const Rounds = 10;
    try {
        const hashedPassword = await bcrypt.hash(Password, Rounds);
        return hashedPassword;
    } catch (error) {
        console.log('Error hashing password:', error);
        throw error;
    }
};

const comparePassword = async (Password, hashedPassword) => {
    try {
        return await bcrypt.compare(Password, hashedPassword);
    } catch (error) {
        console.error('Error comparing password:', error);
        throw error;
    }
};

module.exports = { hashPassword, comparePassword };