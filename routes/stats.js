const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const Duel = require("../models/duels");

// GET - Collecte les statistiques principales pour un utilisateur donné
router.get("/:token", async function (req, res) {
  try {
    // Vérifie que le token utilisateur est transmis
    if (!req.params.token) {
      res.json({ result: false, error: "Le jeton utilisateur est manquant" });
      return;
    }

    // Cherche l'utilisateur en base
    const userObj = await User.findOne({ token: req.params.token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    const userId = userObj._id;
    const { username, avatarUrl, email, interests } = userObj;

    // Objet résultat structuré pour le front : infos, stats, points, status
    const stats = { user: {}, fromUser: {}, fromCommunity: {}, points: {} };
    stats.user.username = username;
    stats.user.avatarUrl = avatarUrl;
    stats.user.email = email;
    stats.user.interests = interests;

    // Actions réalisées par l'utilisateur : nombre de posts, likes, bookmarks et commentaires
    stats.fromUser.nbPosts = await Post.countDocuments({ userId: userId });
    stats.fromUser.nbLikes = await Like.countDocuments({ userId: userId });
    stats.fromUser.nbBookmarks = await Bookmark.countDocuments({
      userId: userId,
    });
    stats.fromUser.nbComments = await Comment.countDocuments({
      userId: userId,
    });

    // Actions de la communauté sur ses posts, en excluant ses propres actions (pour différencier l'impact)
    const rqOnUser = [
      // Jointure pour relier Like/Bookmark/Comment à chaque post de l'utilisateur
      {
        // On va chercher les données du post
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "authorId",
        },
      },
      {
        // On extrait l'auteur du post dans chaque action
        $project: {
          postId: 1,
          authorId: {
            $arrayElemAt: ["$authorId.userId", 0],
          },
          userId: 1,
        },
      },
      {
        // On ne garde que les actions sur les posts de l'utilisateur
        $match: {
          authorId: userId,
        },
      },
      {
        // On exclut les actions de l'utilisateur sur ses propres posts
        $match: {
          userId: { $ne: userId }, // clef: celui qui a liké, valeur: celui qui a posté
        },
      },
    ];

    // Calcul des stats communautaires via aggregation
    stats.fromCommunity.nbLikes = (await Like.aggregate(rqOnUser)).length;
    stats.fromCommunity.nbBookmarks = (
      await Bookmark.aggregate(rqOnUser)
    ).length;
    stats.fromCommunity.nbComments = (await Comment.aggregate(rqOnUser)).length;

    // Calcul des duels remportés (posts de l'utilisateur ayant gagné un duel)
    const rqDuel = [
      {
        // On va chercher les données du post
        $lookup: {
          from: "posts",
          localField: "winnerPostId",
          foreignField: "_id",
          as: "winnerId",
        },
      },
      {
        // On récupère l'auteur du post gagnant
        $project: {
          winnerPostId: 1,
          winnerId: {
            $arrayElemAt: ["$winnerId.userId", 0],
          },
          userId: 1,
        },
      },
      {
        // On filtre sur l'auteur du post
        $match: {
          winnerId: userId,
        },
      },
    ];
    stats.fromCommunity.nbWonDuels = (await Duel.aggregate(rqDuel)).length;

    // Attribution des points selon les actions réalisées (pondération par type d'action)
    const pointsParams = {
      fromUser: { nbLikes: 1, nbComments: 2, nbBookmarks: 5, nbPosts: 10 },
      fromCommunity: {
        nbLikes: 2,
        nbComments: 4,
        nbBookmarks: 10,
        nbWonDuels: 20,
      },
    };
    stats.points.fromUser = Object.keys(pointsParams.fromUser).reduce(
      (acc, key) => {
        return acc + pointsParams.fromUser[key] * stats.fromUser[key];
      },
      0
    );
    stats.points.fromCommunity = Object.keys(pointsParams.fromCommunity).reduce(
      (acc, key) => {
        return acc + pointsParams.fromCommunity[key] * stats.fromCommunity[key];
      },
      0
    );
    stats.points.total = stats.points.fromUser + stats.points.fromCommunity;

    // Calcul du statut utilisateur selon le nombre total de points
    const statusParams = [
      { minPoints: 0, status: "Bizuth de l'échec" },
      { minPoints: 50, status: "Maladroit occasionnel" },
      { minPoints: 100, status: "Rateur professionnel" },
      { minPoints: 150, status: "Serial Failer" },
      { minPoints: 200, status: "Loser magnifique" },
    ];
    for (let i = statusParams.length - 1; i >= 0; i--) {
      if (stats.points.total >= statusParams[i].minPoints) {
        stats.points.status = statusParams[i].status;
        break;
      }
    }
    // Renvoie toutes les statistiques calculées au front
    res.json({ result: true, stats: stats });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
