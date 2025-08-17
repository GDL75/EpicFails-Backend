const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const Duel = require("../models/duels");

// collecte les principales statistiques de l'utilisateur
router.get("/:token", async function (req, res) {
  try {
    // le token du user est nécessaire pour la collecte des posts, likes, bookmarks, etc.
    if (!req.params.token) {
      res.json({ result: false, error: "User token is missing" });
      return;
    }

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: req.params.token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;
    const { username, avatarUrl, email } = userObj;

    // Initialisation de l'objet de résult
    const stats = { user: {}, fromUser: {}, fromCommunity: {}, points: {} };
    stats.user.username = username;
    stats.user.avatarUrl = avatarUrl;
    stats.user.email = email;

    // nombre d'actions réalisées par l'utilisateur
    stats.fromUser.nbPosts = await Post.countDocuments({ userId: userId });
    stats.fromUser.nbLikes = await Like.countDocuments({ userId: userId });
    stats.fromUser.nbBookmarks = await Bookmark.countDocuments({
      userId: userId,
    });
    stats.fromUser.nbComments = await Comment.countDocuments({
      userId: userId,
    });

    // nombre d'actions réalisées par la communauté sur les posts de l'utilisateur
    // 1) corps de la requête qui filtrera les likes/comments/bookmarks sur les posts du user
    const rqOnUser = [
      {
        // on va chercher les données du post
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "authorId",
        },
      },
      {
        // on récupère l'auteur du post
        $project: {
          postId: 1,
          authorId: {
            $arrayElemAt: ["$authorId.userId", 0],
          },
          userId: 1,
        },
      },
      {
        // on filtre sur l'auteur du post
        $match: {
          authorId: userId,
        },
      },
      {
        // on exclut les actions de l'auteur sur ses propres posts (déjà comptées à l'étape 1)
        $match: {
          userId: { $ne: userId }, // clef: celui qui a liké, valeur: celui qui a posté
        },
      },
    ];

    // 2) collecte des informations simples
    stats.fromCommunity.nbLikes = (await Like.aggregate(rqOnUser)).length;
    stats.fromCommunity.nbBookmarks = (
      await Bookmark.aggregate(rqOnUser)
    ).length;
    stats.fromCommunity.nbComments = (await Comment.aggregate(rqOnUser)).length;

    // requête spécifique pour les duels
    const rqDuel = [
      {
        // on va chercher les données du post
        $lookup: {
          from: "posts",
          localField: "winnerPostId",
          foreignField: "_id",
          as: "winnerId",
        },
      },
      {
        // on récupère l'auteur du post gagnant
        $project: {
          winnerPostId: 1,
          winnerId: {
            $arrayElemAt: ["$winnerId.userId", 0],
          },
          userId: 1,
        },
      },
      {
        // on filtre sur l'auteur du post
        $match: {
          winnerId: userId,
        },
      },
    ];
    stats.fromCommunity.nbWonDuels = (await Duel.aggregate(rqDuel)).length;

    // on calcule le nombre de points
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

    // on calcule le status de l'utilisateur
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

    res.json({ result: true, stats: stats });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
