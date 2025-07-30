const mongoose = require("mongoose");

const interestSchema = mongoose.Schema({
  name: String,
  icon: String,
});

const Interest = mongoose.model("interests", interestSchema);

module.exports = Interest;
