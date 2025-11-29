const mongoose = require("mongoose");

// Schéma des commentaires, associé à un utilisateur et à un post.
const commentSchema = mongoose.Schema({
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
  comment: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
});

const Comment = mongoose.model("comments", commentSchema);

module.exports = Comment;