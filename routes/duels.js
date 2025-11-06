const express = require("express");
const router = express.Router();
const User = require("../models/users");
const Duel = require("../models/duels");
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

// Envoyer un duel
router.post("/create-duel", async (req, res) => {
  // Récupération des données envoyées dans la requête
  const { token, category, post1Id, post2Id, winnerPostId } = req.body;
  try {
    // Vérifie que toutes les données nécessaires sont bien présentes dans la requête
    if (
      !checkBody(req.body, [
        "token",
        "category",
        "post1Id",
        "post2Id",
        "winnerPostId",
      ])
    ) {
      return res.status(400).send({
        result: false,
        error: "Missing or empty fields",
      });
    }
    // Vérifie que l'utilisateur existe grâce à son token (sécurité/accréditation)
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "User not found",
      });
    }
    // Crée le duel et l'enregistre en base (liaison user/category/posts)
    const failduel = new Duel({
      userId: user._id,
      category,
      post1Id,
      post2Id,
      winnerPostId,
      date: new Date(),
    });
    await failduel.save();
    // Retour réussite
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

// Récupérer le podium par catégorie : top 3 des posts les plus souvent gagnants sur une catégorie donnée
router.get("/podium/:category", async (req, res) => {
  // 1. On ne garde que les duels correspondant à la catégorie demandée
  // 2. On groupe les résultats par winnerPostId et on compte le nombre d'apparitions (sortByCount)
  try {
    const duels = await Duel.aggregate([
      // Filtrer les duels pour ne garder que les documents dont la propriété category est celle envoyée par le frontend
      {
        $match: { category: req.params.category },
      },
      // Regroupe les duels en fonction de la valeur de "winnerPostId" (donc par ID de post) + compte le nombre de duels par groupe d'ID (le nomber de duels gagnés par un même post)
      {
        $sortByCount: "$winnerPostId",
      },
    ]);
    // Permet de récupérer les 3 posts les plus victorieux dans cette catégorie (podium)
    // On récupère le contenu détaillé de chaque post à partir de son ID
    const firstPlace = await Post.findById(duels[0]._id);
    const secondPlace = await Post.findById(duels[1]._id);
    const thirdPlace = await Post.findById(duels[2]._id);
    res.status(201).send({
      result: true,
      podium: [firstPlace, secondPlace, thirdPlace],
    });
  } catch (err) {
    // Gestion d’erreur agrégée
    res.status(500).send({
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;
