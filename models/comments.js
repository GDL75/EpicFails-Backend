const mongoose = require("mongoose");

// Schéma des commentaires, associé à un utilisateur et à un post.
const commentSchema = mongoose.Schema({
  // userId : référence à l'auteur du commentaire
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  // postId : identifie le post commenté 
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // comment : contenu du commentaire
  comment: { type: String, required: true },
  // date : date à laquelle le commentaire a été posté
  date: { type: Date, required: true, default: Date.now },
});

const Comment = mongoose.model("comments", commentSchema);

module.exports = Comment;