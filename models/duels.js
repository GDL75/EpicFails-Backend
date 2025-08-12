const mongoose = require("mongoose");

const duelSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
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