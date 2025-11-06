const mongoose = require("mongoose");

// Schéma "Post" : représente une publication faite par un utilisateur
const postSchema = mongoose.Schema({
  // userId : identifiant de l'utilisateur ayant créé le post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  // Titre du post (obligatoire)
  title: { type: String, required: true },
  // Date de création du post
  date: { type: Date, required: true, default: Date.now },
  // Domaine d'intérêt du post. Enum pour restreindre à des thèmes précis
  interest: {
    type: String,
    required: true,
    enum: [
      "Cuisine",
      "Jardinage",
      "Bricolage",
      "Auto",
      "Art",
      "Couture",
      "Bugs",
      "Autre",
    ],
  },
  // Description du post (optionnelle)
  description: String,
  // URL de la photo attendue avant réalisation (optionnelle)
  expectedPhotoUrl: String,
  // URL de la photo réelle prise après réalisation (obligatoire)
  actualPhotoUrl: { type: String, required: true },
});

const Post = mongoose.model("posts", postSchema);

module.exports = Post;
