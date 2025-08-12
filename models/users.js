const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  token: { type: String, required: true },
  hasAcceptedGC: { type: Boolean, required: true },
  signUpDate: { type: Date, required: true, default: Date.now },
  avatarURL: {
    type: String,
    default:
      "https://res.cloudinary.com/dtnbiqfov/image/upload/v1755015141/953789_bkxjio.jpg",
  },
  status: String,
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
  resetCode: String,
});

const User = mongoose.model("users", userSchema);

module.exports = User;
