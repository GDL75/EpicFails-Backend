const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    token: String,
    hasAcceptedTC: Boolean,
    signUpDate: Date,
    avatarURL: String,
    status: String,
    interests: [String]
})

const User = mongoose.model('users', userSchema);

module.exports = User;