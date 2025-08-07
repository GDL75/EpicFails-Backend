const express = require("express");
const router = express.Router();

require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");

const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST téléverse une photo dans Cloudinary et met à jour la bdd
router.post("/upload/:photoType", async function (req, res) {
  try {
    if (!req.files.photoFromFront) {
      return res.json({ result: false, error: "No photo received from frontend" });
    }
    console.log("req.files", req.files);
    const photoPath = `./tmp/${uniqid()}.jpg`;
    // on met une copie de la phot dans le dossier tmp
    // J'ai retiré le resultMove (je n'arrivais pas à le faire marcher) et l'ai remplacé par le try/catch
    await req.files.photoFromFront.mv(photoPath);

    // on définit le dossier d'enregistrement en fonction du param de la route
    const folder = req.params.photoType === "user" ? "EF_Users" : "EF_Fails"
    console.log("req.params",req.params,"folder", folder);

    // téléversement dans Cloudinary
    const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
      folder: folder,
    });

    // suppression du fichier temporaire
    fs.unlinkSync(photoPath);

    res.json({ result: true, url: resultCloudinary.secure_url });
  } catch (error) {
    console.error("Error while uploading the photo:", error);
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;