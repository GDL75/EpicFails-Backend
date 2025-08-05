const mongoose = require("mongoose");

const bookmarkSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "posts",
    required: true,
  },
  date: { type: Date, required: true, default: Date.now },
});

const Bookmark = mongoose.model("bookmarks", bookmarkSchema);

module.exports = Bookmark;