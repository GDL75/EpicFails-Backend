// Upload une photo dans Cloudinary
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
// Bibliothèque pour compresser les photos trop lourdes
const sharp = require("sharp"); 

// Configuration Cloudinary avec les identifiants stockés dans les variables d'environnement (sécurité)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPhoto(photoForm) {
  try {
    // Si aucune photo n'est fournie ou si elle est vide, on retourne OK avec url=null (pour les photos facultatives)
    if (!photoForm || photoForm.size === 0) {
      return { result: true, url: null }; // true car c'est ok sur photo facultative
    }

    // Génère un nom unique pour le fichier temporaire et le place dans le dossier tmp
    let photoPath = `./tmp/${uniqid()}.jpg`;
    await photoForm.mv(photoPath);

     // Compression automatique si la photo fait plus de 10 Mo (améliore les performances)
    if (photoForm.size > 10 * 1024 * 1024) {
      const compressedPath = `./tmp/${uniqid()}_compressed.jpg`;
      await sharp(photoPath).jpeg({ quality: 80 }).toFile(compressedPath);
      // On utilise désormais la version compressée
      photoPath = compressedPath; 
    }

    // Détermine le dossier Cloudinary selon le type de photo (Users pour avatars, Fails pour les posts)
    const folder = photoForm.name === "user" ? "Users" : "Fails";

    // Upload vers Cloudinary dans le dossier approprié
    const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
      folder: folder,
    });

    // Supprime le fichier temporaire du serveur (nettoyage)
    fs.unlinkSync(photoPath);

    // Retourne l'URL sécurisée de l'image uploadée
    return { result: true, url: resultCloudinary.secure_url };
  } catch (error) {
    // En cas d'erreur, retourne un message d'erreur
    return { result: false, error: "Erreur lors du téléchargement de la photo:" + error };
  }
}

module.exports = { uploadPhoto };
