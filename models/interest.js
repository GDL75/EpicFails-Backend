const mongoose = require("mongoose");

// *** À EFFACER *** les centres d'intérêts ne nécessitent finalement pas une collection en bdd

const interestSchema = mongoose.Schema({
  name: String,
  icon: String,
});

const Interest = mongoose.model("interests", interestSchema);

module.exports = Interest;
