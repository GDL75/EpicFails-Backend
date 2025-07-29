const express = require("express");
const router = express.Router();
require("../models/connection");

const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");

/* GET users listing. */
router.get("/", async function (req, res, next) {
  const users = await User.find();
  res.json({ users: users });
  // res.send("respond with a resource");
});

// POST l'utilisateur accepte la charte de bienveillance -----------------------------------------
router.post("/acceptsGC", async function (req, res) {
  if (!checkBody(req.body, ["token"])) {
    res.json({ result: false, error: "Token is missing" });
    return;
  } else {
    const foundUser = await User.find({ token: req.body.token });
    if (foundUser.length === 0) {
      res.json({ result: false, error: "User doesn't exist in database" });
      return;
    }
  }

  // recherche l'utilisateur et enregistre l'acceptation de la CB
  await User.updateOne({ token: req.body.token }, { hasAcceptedGC: true });
  res.json({ result: true });
});

module.exports = router;
