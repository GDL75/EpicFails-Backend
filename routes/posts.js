const express = require("express");
const router = express.Router();
require("../models/connection");
const Post = require("../models/posts");
const User = require("../models/users");
const Like = require("../models/likes");
const { checkBody } = require("../modules/checkBody");
const { sortObjectArray } = require("../modules/sortObjectArray");

// GET de tous les posts avec deux paramètres facultatifs dans le body :
// interest (array de string) : pour filtrer sur un ou plusieurs centres d'intérêts
// nbMax (integer) : nombre maximum de posts en retour
router.get("/", async function (req, res) {
  try {
    // on s'assure que req.body.interest ait le bon format (tableau d'une ou plusieurs chaînes)
    let interests = req.body.interests;

    if (typeof interests === "string") {
      // il n'y a qu'un seul centre d'intérêt
      interests = [interests]; // on le transforme en tableau
    } else if (!Array.isArray(interests)) {
      // isArray seul n'existe pas, il faut faire Array.isArray
      interests = null;
      // et sinon, interest est déjà un tableau et il n'y a pas de retraitement à faire
    }
    // on va chercher les posts dans la bdd selon qu'un ou plusieurs intérêts aient été renseignés
    const posts = interests
      ? await Post.find({ interest: { $in: interests } })
      : await Post.find();

    // tri par date, les plus récents en premier
    let sortedPosts = sortObjectArray(posts, "date", -1);

    // on tronque la liste si un nbmax a été renseigné dans le body
    req.body.nbMax && (sortedPosts = sortedPosts.slice(0, req.body.nbMax));

    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST Création d'un post en BDD (hors cloudinary pour l'instant)
router.post("/", async function (req, res) {
  try {
    if (
      !checkBody(req.body, ["userID", "title", "interest", "actualPhotoURL"])
    ) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    } else {
      // champs autorisés en entrée de la bdd
      const {
        userId,
        title,
        interest,
        description,
        actualPhotoURL,
        expectedPhotoURL,
        isOpenToDuel,
      } = req.body;
      // nouveau document à créer en bdd
      const newPost = new Post({
        userId,
        title,
        interest,
        description,
        date: new Date(),
        expectedPhotoURL,
        actualPhotoURL,
        isOpenToDuel: isOpenToDuel ? true : false,
      });
      // enregistrement en bdd
      await newPost.save();
      res.json({ result: true, newPost: newPost });
    }
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
    } else {
      // champs autorisés en entrée de la bdd
      const { token, postId } = req.body;

      // on va cherche l'ID de l'utilisateur en fonction du token
      const user = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
      const userId = user._id
      if (userId.length === 0) {
        res.json({
          result: false,
          error: "No user with this token in database",
        });
        return;
      }

      // on vérifie que le postId existe bien dans la bdd
      const isPostId = await Post.find({ _id: postId });
      if (isPostId.length === 0) {
        res.json({
          result: false,
          error: "This post does not exist in database",
        });
        return;
      }

      // Y a-t-il déjà un like en bdd ? Toggle selon la réponse
      const isLike = await Like.find({ userId: userId, postId: postId })
      if (isLike.length === 0) { // le post n'est pas encore liké par le user => on ajoute le like
        const newLike = new Like({
          userId,
          postId,
          date: new Date(),
        });
        // enregistrement en bdd
        await newLike.save();
        res.json({ result: true, newLikeId: newLike._id });
      } else {  // le post était liké par le user => on supprime ce like
        await Like.deleteOne({ userId: userId, postId: postId });
        res.json({ result: true });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
