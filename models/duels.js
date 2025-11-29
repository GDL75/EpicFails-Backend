const mongoose = require("mongoose");

// Schéma d'un duel : permet de comparer deux posts dans une catégorie donnée, avec un gagnant sélectionné.
const duelSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  post1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  post2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  winnerPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  date: { type: Date, required: true, default: Date.now },
});

const Duel = mongoose.model("duels", duelSchema);

module.exports = Duel;