const express = require("express");
const router = express.Router();
const User = require("../models/users");
const Duel = require("../models/duels");
const Post = require('../models/posts');
const { checkBody } = require('../modules/checkBody')

// POST - Create duel - Créer un duel
router.post("/create-duel", async (req, res) => {
  // ↩️ Data-in
  const { token, category, post1Id, post2Id, winnerPostId } = req.body;

  // ⚙️ Logic & ↪️ Data-out
  try {
    // 1. Checking that all fields are filled -- Vérifier que tous les champs aient été renseignés
    if (!checkBody(req.body, ["token", "category", "post1Id", "post2Id", "winnerPostId"])) {
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
    const failduel = new Duel({
      userId: user._id,
      category,
      post1Id,
      post2Id,
      winnerPostId,
      date: new Date(),
    });
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

// GET test route for aggregate request :
router.get("/podium/:category", async(req, res) => {
  // AGGREGATION OPERATION
  try {
    const duels = await Duel.aggregate([
      // Filter duels whose "category" property is sent by frontend
      // Filtrer les duels pour ne garder que les documents dont la propriété category est celle envoyée par le frontend
      {
        $match: { category: req.params.category }
      },
      // Groups those duels by value of the "winnerPostId" property + computes the number of duels in each group
      // Regroupe les duels en fonction de la valeur de "winnerPostId" (donc par ID de post) + compte le nombre de duels par groupe d'ID (le nomber de duels gagnés par un même post)
      { 
        $sortByCount: "$winnerPostId"
      }
    ])
    // TEST 
    console.log("Voici un tableau des winnerPostId classé par nombre d'occurence", duels)

    const firstPlace = await Post.findById(duels[0]._id)
    const secondPlace = await Post.findById(duels[1]._id)
    const thirdPlace = await Post.findById(duels[2]._id)
    console.log(duels[0]);
    

    res.status(201).send({
      result: true,
      podium: [ firstPlace, secondPlace, thirdPlace ]
    })
  } catch (err) {
    res.status(500).send({
      message: "Server error",
      error: err.message,
    })
  }
})

// // GET - Get podium by category - Récupérer le podium d'une catégorie
// router.get("/podium/:category", async (req, res) => {
//   try {
//     const { category } = req.params;

//     // Logique pour récupérer le top 3 des posts de cette catégorie
//     // Ici tu peux ajuster selon tes critères (votes, likes, etc.)
//     const Post = require("../models/posts"); // Assure-toi d'avoir le bon chemin

//     const podium = await Post.find({ interest: category })
//       .sort({ createdAt: -1 }) // Tri par date pour l'instant, à ajuster selon tes besoins
//       .limit(3);

//     res.json({
//       result: true,
//       podium,
//     });
//   } catch (error) {
//     res.status(500).json({
//       result: false,
//       error: error.message,
//     });
//   }
// });

module.exports = router;
