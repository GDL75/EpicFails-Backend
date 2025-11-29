const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Comment = require("../models/comments");
const User = require("../models/users");
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

// Obtenir tous les commentaires d'un post donné
router.get("/:postId", async (req, res) => {
  try {
    let postId = req.params.postId.trim();
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ result: false, error: "Format postId invalide" });
    }
    postId = new mongoose.Types.ObjectId(postId);
    // On ne popule QUE username et avatar pour ne pas exposer le token immédiatement
    const comments = await Comment.find({ postId })
      .sort({ date: -1 })
      .populate("userId", "username avatarUrl");
    const userIds = comments.map((c) => c.userId?._id).filter(Boolean);
    // Va chercher uniquement le champ "token" des utilisateurs concernés (pas tout le profil)
    const usersWithTokens = await User.find(
      { _id: { $in: userIds } },
      { token: 1 }
    );
    const tokenMap = {};
    usersWithTokens.forEach((user) => {
      tokenMap[user._id.toString()] = user.token;
    });
    // Ajoute les tokens à la réponse pour chaque commentaire
    const enrichedComments = comments.map((comment) => {
      const commentObj = comment.toObject();
      if (commentObj.userId) {
        commentObj.userId.token = tokenMap[commentObj.userId._id.toString()];
      }
      return commentObj;
    });
    res.json({ result: true, comments: enrichedComments });
  } catch (error) {
    res.status(400).json({ result: false, error: error.message });
  }
});

// Envoi d'un commentaire sur un post
router.post("/", async function (req, res) {
  try {
    // Vérifie la présence des données obligatoires grâce au module checkBody
    if (!checkBody(req.body, ["token", "postId", "comment"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    const { token, postId, comment } = req.body;
    // Recherche de l'utilisateur associé au token
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Le jeton n'existe pas dans la base de données" });
      return;
    }
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "Ce message n'existe pas dans la base de données",
      });
      return;
    }
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

// Suppression d'un commentaire sur un post
router.delete("/", async function (req, res) {
  try {
    // Vérifie la présence des champs attendus
    if (!checkBody(req.body, ["token", "commentId"])) {
      res.json({ result: false, error: "Certaines données obligatoires sont manquantes" });
      return;
    }
    const { token, commentId } = req.body;
    // Cherche le commentaire à supprimer
    const comment = await Comment.findOne({ _id: commentId });
    if (!comment) {
      res.json({
        result: false,
        error: "Ce commentaire n'existe pas dans la base de données",
      });
      return;
    }
    //On vérifie que l'utilisateur connecté soit bien l'auteur commentaire
    const author = await User.findOne({ _id: comment.userId });
    if (!author) {
      res.json({
        result: false,
        error: "Le jeton utilisateur n'existe pas dans la base de données",
      });
      return;
    }
    // Autorise la suppression si c'est bien l'auteur (si le token correspond)
    if (token === author.token) {
      await Comment.deleteOne({ _id: commentId });
    } else {
      res.json({
        result: false,
        error: "L'utilisateur connecté n'est pas l'auteur du commentaire",
      });
      return;
    }
    res.json({
      result: true,
      message: "Commentaire supprimé avec succès",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;