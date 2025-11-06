const mongoose = require("mongoose");

// Schéma d'un duel : permet de comparer deux posts dans une catégorie donnée, avec un gagnant sélectionné.
const duelSchema = mongoose.Schema({
  // Utilisateur qui a créé le duel
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  // Catégorie du duel (ex : "Sport", "Cuisine", ...)
  category: {
    type: String,
    required: true,
  },
  // Premier post du duel
  post1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // Deuxième post du duel
  post2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // Le post gagnant (forcement l'un des deux ci-dessus)
  winnerPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  // Date de création du duel
  date: { type: Date, required: true, default: Date.now },
});

const Duel = mongoose.model("duels", duelSchema);

module.exports = Duel;