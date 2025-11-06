const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const Duel = require("../models/duels");
const { checkBody } = require("../modules/checkBody");
const { uploadPhoto } = require("../modules/uploadPhoto");
const { sortObjectArray } = require("../modules/sortObjectArray");

/* --------------------- GET ------------------------ */
// Retourne tous les posts pour un utilisateur identifié par son token
router.get("/:token", async function (req, res) {
  try {
    if (!req.params.token) {
      // Vérifie que le token utilisateur est bien transmis
      res.json({ result: false, error: "Le jeton utilisateur est manquant" });
      return;
    }
    // Agrégation pour ne récupérer que les champs utiles + l'auteur
    const rqPosts = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          _id: 1,
          username: { $arrayElemAt: ["$user.username", 0] },
          avatarUrl: { $arrayElemAt: ["$user.avatarUrl", 0] },
          token: { $arrayElemAt: ["$user.token", 0] },
          title: 1,
          date: 1,
          interest: 1,
          actualPhotoUrl: 1,
          expectedPhotoUrl: 1,
          description: 1,
        },
      },
    ];
    const posts = await Post.aggregate(rqPosts);
    let sortedPosts = sortObjectArray(posts, "date", -1);
    // Recherche du user connecté pour gérer les likes, signets, etc.
    const userObj = await User.findOne({ token: req.params.token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    const userId = userObj._id;
    // Pour chaque post : compte et état des likes, signets, commentaires
    if (sortedPosts.length > 0) {
      for (let item of sortedPosts) {
        // Gestion des likes
        const likes = await Like.find({ postId: item._id });
        const nbLikes = likes.length;
        const isLiked = likes.some((e) => e.userId.equals(userId));
        item.nbLikes = nbLikes;
        item.isLiked = isLiked;
        // Gestion des bookmarks
        const bookmarks = await Bookmark.find({ postId: item._id });
        const nbBookmarks = bookmarks.length;
        const isBookmarked = bookmarks.some((e) => e.userId.equals(userId));
        item.nbBookmarks = nbBookmarks;
        item.isBookmarked = isBookmarked;
        // Gestion des comments
        const comments = await Comment.find({ postId: item._id });
        const nbcomments = comments.length;
        const isCommented = comments.some((e) => e.userId.equals(userId));
        item.nbComments = nbcomments;
        item.isCommented = isCommented;
      }
    }
    // Réponse : tous les posts enrichis pour l'utilisateur
    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Retourne tous les posts pour un centre d'intérêt donné, valide d'abord l'user
router.get("/:token/:interest", async (req, res) => {
  try {
    // On récupère l'utilisateur via le token
    const isUser = await User.findOne({ token: req.params.token });
    if (!isUser) {
      return res.status(404).send({ result: false, error: "Utilisateur non trouvé" });
    }
    // On recherche les posts concernés
    const interestPosts = await Post.find({ interest: req.params.interest });
    if (!interestPosts) {
      return res.status(404).send({
        result: false,
        error: "No posts for this interest",
      });
    }
    res.status(200).send({ result: true, posts: interestPosts });
  } catch (err) {
    res.status(500).send({ result: false, error: err.message });
  }
});

/* -------------------- POST ------------------------ */
// Création d'un post (upload des photos et vérif du user)
router.post("/", async function (req, res) {
  try {
    // Présence des champs obligatoires
    if (!checkBody(req.body, ["token", "title", "interest"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    // Upload des photos (obligatoire et facultative)
    const actualPhotoUpload = await uploadPhoto(req.files.photoObligatoire);
    if (!actualPhotoUpload.result) {
      return res.json(actualPhotoUpload.error);
    }
    const expectedPhotoUpload = await uploadPhoto(req.files.photoFacultative);
    if (!expectedPhotoUpload.result) {
      return res.json(expectedPhotoUpload.error);
    }
    // Cherche le user qui crée le post
    const { title, interest, description } = req.body;
    const userObj = await User.findOne({ token: req.body["token"] });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    // Création du post
    const userId = userObj._id;
    const newPost = new Post({
      userId,
      title,
      interest,
      description,
      date: new Date(),
      expectedPhotoUrl: expectedPhotoUpload.url,
      actualPhotoUrl: actualPhotoUpload.url,
    });
    await newPost.save();
    res.json({ result: true, newPost: newPost });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST toggle des likes sur un post
router.post("/like/", async function (req, res) {
  try {
    // Vérifie la présence du token et du postId dans la requête
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    // Récupère l'utilisateur connecté via son token
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    // Vérifie l'existence du post à liker
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "Ce message n'existe pas dans la base de données",
      });
      return;
    }
    // Si l'utilisateur n'a pas encore liké ce post, on l'ajoute, sinon on retire le like (toggle)
    const nbLikes = await Like.countDocuments({ postId: postId });
    const isLike = await Like.findOne({ userId: userId, postId: postId });
    if (!isLike) {
      const newLike = new Like({ userId, postId, date: new Date() });
      await newLike.save();
      res.json({
        result: true,
        isLiked: true,
        newLikeId: newLike._id,
        nbLikes: nbLikes + 1,
      });
    } else {
      await Like.deleteOne({ userId: userId, postId: postId });
      res.json({ result: true, isLiked: false, nbLikes: nbLikes - 1 });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Envoi modification des signets sur un post
router.post("/bookmark/", async function (req, res) {
  try {
    // Vérifie la présence du token et du postId
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    // Récupère l'utilisateur
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    // Vérifie que le post existe
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "Ce message n'existe pas dans la base de données",
      });
      return;
    }
    // Si l'utilisateur n'a pas encore bookmarké, on l'ajoute, sinon on retire le bookmark (toggle)
    const isBookmark = await Bookmark.findOne({
      userId: userId,
      postId: postId,
    });
    if (!isBookmark) {
      const newBookmark = new Bookmark({ userId, postId, date: new Date() });
      await newBookmark.save();
      res.json({
        result: true,
        isBookmarked: true,
        newBookmarkId: newBookmark._id,
      });
    } else {
      await Bookmark.deleteOne({ userId: userId, postId: postId });
      res.json({ result: true, isBookmarked: false });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST ajout d'un commentaire sur un post
router.post("/comment/", async function (req, res) {
  try {
    // Vérifie la présence du token, du postId et du commentaire
    if (!checkBody(req.body, ["token", "postId", "comment"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    // Récupère l'utilisateur
    const { token, postId, comment } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    // Vérifie que le post existe
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "Ce message n'existe pas dans la base de données",
      });
      return;
    }
    // Créé et sauvegarde le commentaire, puis retourne le nombre de commentaires actualisé
    const nbComments = await Comment.countDocuments({ postId: postId });
    const newComment = new Comment({
      userId,
      postId,
      comment,
      date: new Date(),
    });
    await newComment.save();
    res.json({
      result: true,
      isCommented: true,
      newCommentId: newComment._id,
      nbComments: nbComments + 1,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* ------------------- DELETE ----------------------- */

// Suppression d'un post : nécessite d'être l'auteur
router.delete("/", async function (req, res) {
  try {
    // Vérifie que le token et le postId sont présents
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Un jeton et un identifiant de publication sont requis" });
      return;
    }
    // Récupère l'utilisateur
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Invalid token" });
      return;
    }
    // Récupère le post à supprimer et vérifie l'autorisation : seul l'auteur peut 
    const userId = userObj._id;
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      res.json({
        result: false,
        error: "Ce message n'existe pas dans la base de données",
      });
      return;
    }
    // Autorisation suppression : doit être auteur
    if (!post.userId.equals(userId)) {
      res.json({
        result: false,
        error: "Vous n'êtes pas autorisé à supprimer ce message",
      });
      return;
    }
    // Supprime le post et toutes ses relations associées (likes, signets, commentaires, duels où il est gagnant)
    await Post.deleteOne({ _id: postId });
    await Like.deleteMany({ postId: postId });
    await Bookmark.deleteMany({ postId: postId });
    await Comment.deleteMany({ postId: postId });
    await Duel.deleteMany({ winnerPostId: postId });
    res.json({ result: true, message: "Message supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du message:", error);
    res.status(500).json({ result: false, error: error.message });
  }
});

module.exports = router;
