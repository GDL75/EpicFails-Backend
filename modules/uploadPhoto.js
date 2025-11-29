// Upload une photo dans Cloudinary
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const sharp = require("sharp"); 

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPhoto(photoForm) {
  try {
    // Si aucune photo n'est fournie ou si elle est vide, on retourne OK avec url=null (pour les photos facultatives)
    if (!photoForm || photoForm.size === 0) {
      return { result: true, url: null }; 
    }

    // Génère un nom unique pour le fichier temporaire et le place dans le dossier tmp
    let photoPath = `./tmp/${uniqid()}.jpg`;
    await photoForm.mv(photoPath);

    if (photoForm.size > 10 * 1024 * 1024) {
      const compressedPath = `./tmp/${uniqid()}_compressed.jpg`;
      await sharp(photoPath).jpeg({ quality: 80 }).toFile(compressedPath);
      photoPath = compressedPath; 
    }
    const folder = photoForm.name === "user" ? "Users" : "Fails";
    const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
      folder: folder,
    });

    // Supprime le fichier temporaire du serveur (nettoyage)
    fs.unlinkSync(photoPath);

    return { result: true, url: resultCloudinary.secure_url };
  } catch (error) {
    return { result: false, error: "Erreur lors du téléchargement de la photo:" + error };
  }
}

module.exports = { uploadPhoto };
