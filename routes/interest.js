const express = require("express");
const router = express.Router();
const Interest = require("../models/interest");

// *** À EFFACER *** les centres d'intérêts ne nécessitent finalement pas une collection en bdd

//Post centre d'intérêt
router.post("/", async (req, res) => {
  try {
    const newInterest = new Interest({
      name: req.body.name,
      icon: req.body.icon,
    });
    const savedDoc = await newInterest.save();
    res.status(201).json(savedDoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
