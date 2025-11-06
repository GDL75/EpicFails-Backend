const mongoose = require("mongoose");

// Schéma "User" : informations d'identification et préférences d'un utilisateur
const userSchema = mongoose.Schema({
  // Identifiant choisi par l'utilisateur
  username: { type: String, required: true },
  // Email de l'utilisateur 
  email: { type: String, required: true },
  // Mot de passe sécurisé (stocké hashé en base)
  password: { type: String, required: true },
  // Token d'identification (géré pour les connexions sécurisées)
  token: { type: String, required: true },
  // a accepté les conditions générales (obligatoire à la première connexion)
  hasAcceptedGC: { type: Boolean, required: true },
  // Date d'inscription
  signUpDate: { type: Date, required: true, default: Date.now },
  // URL de l'avatar utilisateur (image par défaut si non fournie)
  avatarUrl: {
    type: String,
    default:
      "https://res.cloudinary.com/dtnbiqfov/image/upload/v1755015141/953789_bkxjio.jpg",
  },
  // Statut/description utilisateur
  status: String,
  // Centres d'intérêt (enum pour limiter aux thèmes définis par l'app)
  interests: {
    type: [String],
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
  // Code pour réinitialiser le mot de passe (optionnel)
  resetCode: String,
});

const User = mongoose.model("users", userSchema);

module.exports = User;
