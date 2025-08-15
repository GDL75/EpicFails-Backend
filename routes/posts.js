const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const { checkBody } = require("../modules/checkBody");
const { uploadPhoto } = require("../modules/uploadPhoto");
const { sortObjectArray } = require("../modules/sortObjectArray");
const { log } = require("console");

// GET de tous les posts avec deux paramètres facultatifs dans le body :
// interest (array de string) : pour filtrer sur un ou plusieurs centres d'intérêts
// nbMax (integer) : nombre maximum de posts en retour
router.get("/:token", async function (req, res) {
  try {
    // le token du user est nécessaire pour l'affichage des likes, bookmarks et comments
    if (!req.params.token) {
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

    // tri par date, les plus récents en premier
    let sortedPosts = sortObjectArray(posts, "date", -1);

    // on récupère l'id du user connecté pour compter les likes, bookmarks et commentaires
    const userObj = await User.findOne({ token: req.params.token }); // findOne donne directement un objet et non un tableau
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

// POST Création d'un post en BDD (hors cloudinary pour l'instant)
router.post("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "title", "interest"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // On upload les photos dans Cloudinary
    const actualPhotoUpload = await uploadPhoto(req.files.photoObligatoire);
    if (!actualPhotoUpload.result) {
      return res.json(actualPhotoUpload.error);
    }
    // pas besoin de if en entrée puisque le test est fait dans la fonction
    const expectedPhotoUpload = await uploadPhoto(req.files.photoFacultative);
    if (!expectedPhotoUpload.result) {
      return res.json(expectedPhotoUpload.error);
    }

    // on récupère les données du body
    const { title, interest, description } = req.body;

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: req.body["token"] }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // nouveau document à créer en bdd
    const newPost = new Post({
      userId,
      title,
      interest,
      description,
      date: new Date(),
      expectedPhotoUrl: expectedPhotoUpload.url,
      actualPhotoUrl: actualPhotoUpload.url,
    });
    // enregistrement en bdd
    await newPost.save();
    res.json({ result: true, newPost: newPost });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE suppression d'un post
router.delete("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["postId"])) {
      res.json({ result: false, error: "The post id is missing" });
      return;
    }
    const postId = req.body.postId;

    // on vérifie que le postId existe bien dans la bdd
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "This post does not exist in database",
      });
      return;
    }

    // on commence par effacer le post lui-même
    await Post.deleteOne({ _id: postId });

    // puis on supprime les likes, bookmarks et commentaires qui y étaient liés
    await Like.deleteMany({ postId: postId });
    await Bookmark.deleteMany({ postId: postId });
    await Comment.deleteMany({ postId: postId });
    // effacer la photo dans cloudinary

    res.json({ result: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST toggle des likes sur un post
router.post("/like/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // champs en entrée de la bdd
    const { token, postId } = req.body;

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // on vérifie que le postId existe bien dans la bdd
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "This post does not exist in database",
      });
      return;
    }

    // combien y a-t-il de likes pour l'instant ?
    const nbLikes = await Like.countDocuments({ postId: postId });

    // Y a-t-il déjà un like en bdd ? Toggle selon la réponse
    const isLike = await Like.findOne({ userId: userId, postId: postId });
    if (!isLike) {
      // le post n'est pas encore liké par le user => on ajoute le like
      const newLike = new Like({
        userId,
        postId,
        date: new Date(),
      });
      // enregistrement en bdd
      await newLike.save();
      res.json({
        result: true,
        isLiked: true,
        newLikeId: newLike._id,
        nbLikes: nbLikes + 1,
      });
    } else {
      // le post était liké par le user => on supprime ce like
      await Like.deleteOne({ userId: userId, postId: postId });
      res.json({ result: true, isLiked: false, nbLikes: nbLikes - 1 });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST toggle des signets sur un post
router.post("/bookmark/", async function (req, res) {
  try {
    console.log(req.body);
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // champs en entrée de la bdd
    const { token, postId } = req.body;

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // on vérifie que le postId existe bien dans la bdd
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "This post does not exist in database",
      });
      return;
    }

    // Y a-t-il déjà un signet en bdd ? Toggle selon la réponse
    const isBookmark = await Bookmark.findOne({
      userId: userId,
      postId: postId,
    });
    if (!isBookmark) {
      // le post n'est pas encore bookmarké par le user => on ajoute le signet
      const newBookmark = new Bookmark({
        userId,
        postId,
        date: new Date(),
      });
      // enregistrement en bdd
      await newBookmark.save();
      res.json({
        result: true,
        isBookmarked: true,
        newBookmarkId: newBookmark._id,
      });
    } else {
      // le post était bookmarké par le user => on supprime ce signet
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
    if (!checkBody(req.body, ["token", "postId", "comment"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // champs en entrée de la bdd
    const { token, postId, comment } = req.body;

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // on vérifie que le postId existe bien dans la bdd
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "This post does not exist in database",
      });
      return;
    }

    // combien y a-t-il de commentaires pour l'instant ?
    const nbComments = await Comment.countDocuments({ postId: postId });

    // on prépare le commentaire et on l'enregistre
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

// GET obtention de tous les posts d'un même centre d'intérêt
router.get("/:token/:interest", async (req, res) => {
  // ↩️ Data-in
  try {
    // 1. Checking user is in DB - vérifier que l'utilisateur est en BDD
    const isUser = await User.findOne({ token: req.params.token });
    if (!isUser) {
      return res.status(404).send({
        result: false,
        error: "User not found",
      });
    }

    // ⚙️ Logic
    // 2. Searching post collection in DB for posts with an interest property whose value is that of the frontend param
    // - Recherche des posts dans la DB dont la valeur propriété interest est celle du param envoyé par le frontend
    const interestPosts = await Post.find({ interest: req.params.interest });
    if (!interestPosts) {
      return res.status(404).send({
        result: false,
        error: "No posts for this interest",
      });
    }

    // ↪️ Data-out
    res.status(200).send({
      result: true,
      posts: interestPosts,
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

module.exports = router;
