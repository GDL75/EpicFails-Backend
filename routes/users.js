const express = require("express");
const router = express.Router();
require("../models/connection");

const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
const { uploadPhoto } = require("../modules/uploadPhoto");

const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const checkEmail = require("../modules/checkEmail");

const nodemailer = require("nodemailer");

// POST - L'utilisateur accepte la charte de bienveillance (case à cocher à la première connexion)
router.post("/acceptsGC", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token"])) {
      res.json({ result: false, error: "Le jeton est manquant" });
      return;
    } else {
      const foundUser = await User.find({ token: req.body.token });
      if (foundUser.length === 0) {
        res.json({ result: false, error: "L'utilisateur n'existe pas dans la base de données" });
        return;
      }
    }
    // Met à jour la propriété "hasAcceptedGC" à true pour ce user
    await User.updateOne({ token: req.body.token }, { hasAcceptedGC: true });
    res.json({ result: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST - Inscription (signup)
router.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;
  try {
    // Vérifie la complétude du formulaire
    if (!checkBody(req.body, ["email", "username", "password"])) {
      return res.status(400).send({
        result: false,
        error: "Champs manquants ou vides",
      });
    }
    // Vérifie la validité de l'email
    if (!checkEmail(email)) {
      return res.status(400).send({
        result: false,
        error: "E-mail invalide",
      });
    }
    // Vérifie que l'email n'est pas déjà utilisé
    const isEmailInDB = await User.findOne({ email });
    if (isEmailInDB) {
      return res.status(400).send({
        result: false,
        error: "L'utilisateur existe déjà",
      });
    }
    // Vérifie la disponibilité du nom d'utilisateur
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).send({
        result: false,
        error: "Le nom d'utilisateur est déjà pris",
      });
    }

    // Création de l'utilisateur : hash du mot de passe, génération d'un token unique
    user = new User({
      username,
      email,
      password: bcrypt.hashSync(password, 10),
      token: uid2(32),
      hasAcceptedGC: false,
      signUpDate: new Date(),
      status: "Newbie",
      interests: [],
      resetCode: 0,
    });

    await user.save();
    res.status(201).send({
      result: true,
      message: "Utilisateur inscrit !",
      token: user.token,
    });

    // Upload de la photo de profil si fournie, sinon avatar par défaut
    if (req.files?.profilePic) {
      uploadPhoto(req.files.profilePic)
        .then((profilePicUpload) =>
          User.updateOne({ _id: user._id }, { avatarUrl: profilePicUpload.url })
        )
        .catch((err) => console.error("Le téléchargement de la photo a échoué:", err.message));
    } else {
      // S'il n'y a pas de photo, on renseigne la photo par défaut
      await User.updateOne(
        { _id: user._id },
        {
          avatarUrl:
            "https://res.cloudinary.com/dtnbiqfov/image/upload/v1755015141/953789_bkxjio.jpg",
        }
      );
    }
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// POST - Connexion (signin)
router.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Vérifie la présence des champs
    if (!checkBody(req.body, ["username", "password"])) {
      return res.status(400).send({
        result: false,
        error: "Missing or empty fields",
      });
    }
    // Recherche le user par username
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Champs manquants ou vides",
      });
    }
    // Vérifie le mot de passe (hashé)
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).send({
        result: false,
        error: "Mot de passe incorrect",
      });
    }
    res.status(201).send({
      result: true,
      message: "Utilisateur connecté !",
      token: user.token,
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// POST - Envoie un code de vérification par mail à l'utilisateur
router.post("/send-code", async (req, res) => {
  const { email } = req.body;
  try {
    if (!checkEmail(email)) {
      return res.status(400).send({
        result: false,
        error: "E-mail invalide",
      });
    }

    // Vérifie que le user existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Utilisateur non trouvé",
      });
    }

    // Génère un code aléatoire à 6 chiffres hashé
    const digitCode = Math.floor(
      Math.random() * (999999 - 100000 + 1) + 100000
    );
    await User.updateOne(
      { email },
      { resetCode: bcrypt.hashSync(digitCode.toString(), 10) }
    );

    // Prépare le mail et envoie via nodemailer (Gmail)
    const mailContent = {
      from: '"EpicFails App" 👾<process.env.GMAIL_ADDRESS>',
      to: email,
      subject: "Votre code de vérification",
      text: `Votre code de vérification est le suivant: ${digitCode}`,
    };

    //Créer un transporteur d'email requis par nodemailer via Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Envoie du mail
    await transporter.sendMail(mailContent);

    res.status(201).send({
      result: true,
      message: "Code de vérification envoyé !",
      code: digitCode,
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// POST - Vérifie le code de validation reçu par mail
router.post("/check-code", async (req, res) => {
  const { email, digitCode } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Utilisateur non trouvé",
      });
    }
    if (digitCode < 100000 || digitCode > 999999) {
      return res.status(400).send({
        result: false,
        error: "Format de code invalide",
      });
    }
    if (!bcrypt.compareSync(digitCode, user.resetCode)) {
      return res.status(400).send({
        result: false,
        error: "Code invalide",
      });
    }
    await User.updateOne({ email }, { resetCode: 0 });
    res.status(202).send({
      result: true,
      message: "Code vérifié avec succès, vous pouvez maintenant définir un nouveau mot de passe.",
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// POST - Nouveau mot de passe (reset après validation code)
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Utilisateur non trouvé",
      });
    }
    await User.updateOne(
      { email },
      { password: bcrypt.hashSync(password, 10) }
    );
    res.status(201).send({
      result: true,
      message: "Mot de passe mis à jour avec succès !",
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// PUT - Mise à jour du profil utilisateur
router.put("/update-profile", async (req, res) => {
  try {
    const { token, newUsername, newEmail, newPassword } = req.body;
    if (!token) {
      return res.status(400).json({
        result: false,
        error: "Token manquant",
      });
    }
    const updateFields = {};
    if (req.files?.profilePic) {
      const profilePicUpload = await uploadPhoto(req.files.profilePic);
      if (!profilePicUpload.result) {
        return res.status(500).json({
          result: false,
          error: "Erreur lors du téléchargement de la photo",
        });
      }
      updateFields.avatarUrl = profilePicUpload.url;
    }
    if (newUsername) {
      updateFields.username = newUsername;
    }
    if (newEmail) {
      updateFields.email = newEmail;
    }
    if (newPassword) {
      updateFields.password = bcrypt.hashSync(newPassword, 10);
    }
    const updateResult = await User.updateOne({ token: token }, updateFields);
    res.json({
      result: true,
      message: "Profil mis à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

// GET - Retourne les intérêts de l'utilisateur
router.get("/interests/:token", async (req, res) => {
  const token = req.params.token;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Utilisateur non trouvé",
      });
    } else {
      res.status(201).send({
        result: true,
        interests: user.interests,
      });
    }
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

// POST - Mise à jour des intérêts utilisateur
router.post("/update-interests", async (req, res) => {
  const { token, interests } = req.body;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).send({
        result: false,
        error: "Utilisateur non trouvé",
      });
    }
    await User.updateOne({ token }, { interests });
    res.status(201).send({
      result: true,
      message: "Intérêts mis à jour avec succès !",
    });
  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message,
    });
  }
});

module.exports = router;
