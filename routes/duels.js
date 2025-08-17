const express = require("express");
const router = express.Router();
const User = require("../models/users");
const Duel = require("../models/duels");
const Post = require('../models/posts');

// POST - Create duel - Créer un duel
router.post("/create-duel", async (req, res) => {
  // ↩️ Data-in
  const { token, post1Id, post2Id, winnerPostId } = req.body;

  // ⚙️ Logic & ↪️ Data-out
  try {
    // 1. Checking that all fields are filled -- Vérifier que tous les champs aient été renseignés
    if (!checkBody(req.body, ["token", "post1Id", "post2Id", "winnerPostId"])) {
      return res.status(400).send({
        result: false,
        error: "Missing or empty fields",
      });
    }
    // 2. Checking that user exists in database  -- Vérifier que l'utilisateur est en BDD
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "User not found",
      });
    }
    // 3. Create fail duel in DB -- Ajout du fail duel en BDD
    const failduel = {
      userId: user._id,
      post1Id,
      post2Id,
      winnerPostId,
      date: new Date(),
    };
    await failduel.save();
    res.status(200).send({
      result: true,
      message: "Fail duel saved to database",
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// GET - Get podium by category - Récupérer le podium d'une catégorie
router.get("/podium/:category", async (req, res) => {
  try {
    const { category } = req.params;

    // Logique pour récupérer le top 3 des posts de cette catégorie
    // Ici tu peux ajuster selon tes critères (votes, likes, etc.)
    const Post = require("../models/posts"); // Assure-toi d'avoir le bon chemin

    const podium = await Post.find({ interest: category })
      .sort({ createdAt: -1 }) // Tri par date pour l'instant, à ajuster selon tes besoins
      .limit(3);

    res.json({
      result: true,
      podium,
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

module.exports = router;
