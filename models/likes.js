const mongoose = require("mongoose");

// Schéma "Like" : représente un j'aime d'un utilisateur sur un post
const likeSchema = mongoose.Schema({
  // Utilisateur ayant liké le post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
   // Post qui reçoit le like
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // Date du like (pour historique/statistiques)
  date: { type: Date, required: true, default: Date.now },
});

const Like = mongoose.model("likes", likeSchema);

module.exports = Like;