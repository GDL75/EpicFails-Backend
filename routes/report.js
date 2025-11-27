const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const User = require("../models/users");
const Post = require("../models/posts");
const Report = require("../models/reports");
const { checkBody } = require("../modules/checkBody");

// POST : création du signalement
router.post("/", async (req, res) => {
  try {
    if (!checkBody(req.body, ["token", "postId", "reasons"])) {
      return res.status(400).json({ result: false, error: "Champs manquants" });
    }
    const { token, postId, reasons } = req.body;

    // Retrouver l'utilisateur responsable du signalement via le token
    const user = await User.findOne({ token });
    if (!user) {
      // Si pas trouvé, on renvoie une erreur
      return res
        .status(400)
        .json({ result: false, error: "Utilisateur non trouvé" });
    }
    // Id du post signaler
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(400).json({ result: false, error: "Post non trouvé" });
    }
    if (user.reportCount && user.reportCount >= 2) {
      return res
        .status(403)
        .json({
          result: false,
          error: "Nombre maximal de signalements atteint.",
        });
    }
    await Report.create({
      userId: user._id,
      postId: post._id,
      reasons,
    });
    await User.updateOne({ _id: user._id }, { $inc: { reportCount: 1 } });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    const mailOptions = {
      from: `"EpicFails App" <${process.env.GMAIL_ADDRESS}>`,
      to: process.env.ADMIN_EMAIL,
      subject: "Nouveau signalement de contenu",
      text: `L'utilisateur ${
        user.username
      } a signalé le post ${postId} pour les raisons suivantes : ${reasons.join(
        ", "
      )}.`,
    };
    await transporter.sendMail(mailOptions);
    res.json({ result: true, message: "Signalement enregistré" });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});
module.exports = router;
