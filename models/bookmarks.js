const mongoose = require("mongoose");

// Schéma qui définit les favoris utilisateurs sur les posts.
const bookmarkSchema = mongoose.Schema({
  // userId : référence à l'utilisateur ayant mis un post en favori
  // Utilise ObjectId pour garantir la relation avec la collection "users"
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  // postId : référence au post mis en favori
  // Utilise ObjectId pour garantir la relation avec la collection "posts"
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // date : sauvegarde la date de mise en favoris
  date: { type: Date, required: true, default: Date.now },
});

const Bookmark = mongoose.model("bookmarks", bookmarkSchema);

module.exports = Bookmark;