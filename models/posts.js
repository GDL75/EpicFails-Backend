const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    userID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'users'
    },
    title: String,
    date: Date,
    description: String,
    expectedPhotoURL: String,
    actualPhotoURL: String,
    isOpenToDual: Boolean
})

const Post = mongoose.model('posts', postSchema);

module.exports = Post;