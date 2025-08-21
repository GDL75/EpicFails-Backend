const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const { sortObjectArray } = require("../modules/sortObjectArray");

// Recherche des fails remplissant les critères. Ce devrait être une route GET mais comme
// il y a trop de paramètres, il est plus simple d'utiliser une POST (objet en entrée)
// On rajoute ensuite les nombres de likes, de commentaires et de signets
router.post("/", async function (req, res) {
  try {
    // on récupère les critères de recherche du front
    const {
      token,
      category = "",
      searchedText = "",
      inUser = false,
      inTitle = false,
      inDescription = false,
      inComment = false,
    } = req.body;
    
    // le token du user est nécessaire pour l'affichage des likes, bookmarks et comments
    if (!token) {
      res.json({ result: false, error: "User token is missing" });
      return;
    }
    
    // on va chercher les posts dans la bdd. Requête aggregate collée depuis Compass
    // (plus efficace qu'un .populate() et permet de choisir les clefs à garder)
    const rqPosts = [
      {
        $lookup: {
          // on ajoute le username et l'avatar grâce au userId
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          // on élimine les autres infos du user (i.e. on ne garde que username et avatar)
          _id: 1,
          username: {
            $arrayElemAt: ["$user.username", 0],
          },
          avatarUrl: {
            $arrayElemAt: ["$user.avatarUrl", 0],
          },
          token: {
            $arrayElemAt: ["$user.token", 0],
          },
          title: 1,
          date: 1,
          interest: 1,
          actualPhotoUrl: 1,
          expectedPhotoUrl: 1,
          description: 1,
        },
      },
    ];
    
    // on ajout ensuite les différents critères, selon qu'ils sont utilisés ou non
    // 1) la catégorie
    if (category !== "") {
      rqPosts.push({
        $match: {
          interest: { $regex: category, $options: "i" },
        },
      });
    }
    // 2) la recherche par chaîne de caractère dans différents champs
    if (
      searchedText !== "" && // texte non vide
      (inUser || inTitle || inDescription || inComment)  // au moins une case cochée
    ) {
      const searchKeys = {};
      inUser && (searchKeys.username = { $regex: searchedText, $options: "i" });
      inTitle && (searchKeys.title = { $regex: searchedText, $options: "i" });
      inDescription &&
        (searchKeys.description = { $regex: searchedText, $options: "i" });
      // on met à jour le pipeline de la requête
      rqPosts.push({ $match: searchKeys });
      // ⚠️ 🚨 il manque les commentaires (un peu plus compliqués...)
    }

    // console.log("rqPosts", rqPosts);
    const posts = await Post.aggregate(rqPosts);

    // tri par date, les plus récents en premier
    let sortedPosts = sortObjectArray(posts, "date", -1);

    // on récupère l'id du user connecté pour compter les likes, bookmarks et commentaires
    const userObj = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // on va chercher les likes, les bookmarks et les commentaires
    if (sortedPosts.length > 0) {
      for (let item of sortedPosts) {
        // les likes
        const likes = await Like.find({ postId: item._id });
        const nbLikes = likes.length;
        const isLiked = likes.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbLikes = nbLikes;
        item.isLiked = isLiked;

        // les bookmarks
        const bookmarks = await Bookmark.find({ postId: item._id });
        const nbBookmarks = bookmarks.length;
        const isBookmarked = bookmarks.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbBookmarks = nbBookmarks;
        item.isBookmarked = isBookmarked;

        // les commentaires
        const comments = await Comment.find({ postId: item._id });
        const nbcomments = comments.length;
        const isCommented = comments.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbComments = nbcomments;
        item.isCommented = isCommented;
      }
    }
    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
