const mongoose = require("mongoose");

// Schéma "Like" : représente un j'aime d'un utilisateur sur un post
const likeSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  date: { type: Date, required: true, default: Date.now },
});

const Like = mongoose.model("likes", likeSchema);

module.exports = Like;