const mongoose = require("mongoose");

const reportSchema = mongoose.Schema({
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
  reasons: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now },
});
const Report = mongoose.model("reports", reportSchema);

module.exports = Report;
