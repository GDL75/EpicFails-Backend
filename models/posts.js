const mongoose = require("mongoose");

// Schéma Publication faite par un utilisateur
const postSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  title: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
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
  description: String,
  expectedPhotoUrl: String,
  actualPhotoUrl: { type: String, required: true },
});

const Post = mongoose.model("posts", postSchema);

module.exports = Post;
