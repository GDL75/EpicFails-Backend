const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const { sortObjectArray } = require("../modules/sortObjectArray");

// Recherche avancée des posts ("fails") selon plusieurs critères fournis en body
// Route POST utilisée car il y a trop de paramètres pour une requête GET classique
router.post("/", async function (req, res) {
  try {
    // Récupère tous les critères de recherche envoyés par le front
    const {
      token,
      category = "",
      searchedText = "",
      inUser = false,
      inTitle = false,
      inDescription = false,
      inComment = false,
    } = req.body;
    // On vérifie que le token est transmis (nécessaire pour afficher likes, bookmarks, comments)
    if (!token) {
      res.json({ result: false, error: "User token is missing" });
      return;
    }

    // Pipeline d'agrégation : récupère les posts en ajoutant les infos de leur auteur (username, avatar)
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
    
    // Ajoute la condition sur la catégorie si précisée
    if (category !== "") {
      rqPosts.push({
        $match: {
          interest: { $regex: category, $options: "i" },
        },
      });
    }
    // Ajoute la/les conditions de recherche textuelle dans les différents champs cochés par l'utilisateur
    if (
      searchedText !== "" && // texte non vide
      (inUser || inTitle || inDescription || inComment)  // au moins une case cochée
    ) {
      const searchKeys = {};
      inUser && (searchKeys.username = { $regex: searchedText, $options: "i" });
      inTitle && (searchKeys.title = { $regex: searchedText, $options: "i" });
      inDescription &&
        (searchKeys.description = { $regex: searchedText, $options: "i" });
      // Ajoute le filtre au pipeline d'agrégation
      rqPosts.push({ $match: searchKeys });
      // ⚠️ 🚨À ce stade, la recherche sur les commentaires n'est pas encore implémentée (note pour évolution du projet)
    }

    // Exécute la requête d'agrégation
    const posts = await Post.aggregate(rqPosts);
    // Trie les posts par date (les plus récents d'abord)
    let sortedPosts = sortObjectArray(posts, "date", -1);

    // On récupère l'id du user connecté pour calculer les likes, signets, commentaires perso
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    const userId = userObj._id;

    // Pour chaque post, ajoute le nombre total et l'état pour likes, signets et commentaires du user
    if (sortedPosts.length > 0) {
      for (let item of sortedPosts) {
        // Likes : nb et si liké par user
        const likes = await Like.find({ postId: item._id });
        const nbLikes = likes.length;
        const isLiked = likes.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbLikes = nbLikes;
        item.isLiked = isLiked;

        // Signets : nb et si déjà bookmarké
        const bookmarks = await Bookmark.find({ postId: item._id });
        const nbBookmarks = bookmarks.length;
        const isBookmarked = bookmarks.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbBookmarks = nbBookmarks;
        item.isBookmarked = isBookmarked;

        // Commentaires : nb et si déjà commenté
        const comments = await Comment.find({ postId: item._id });
        const nbcomments = comments.length;
        const isCommented = comments.some((e) => e.userId.equals(userId));
        // on utilise "equals(...)" car "===" ne fonctionne pas sur des objectId
        item.nbComments = nbcomments;
        item.isCommented = isCommented;
      }
    }
    // Réponse finale : posts enrichis des stats pour l'utilisateur
    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
