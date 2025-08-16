// Upload une photo dans Cloudinary

const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPhoto(photoForm) {
  try {
    if (!photoForm || photoForm.size === 0) {
      return { result: true, url: null }; // true car c'est ok sur photo facultative
    }

    const photoPath = `./tmp/${uniqid()}.jpg`;
    // on met une copie de la photo dans le dossier tmp
    // J'ai retiré le resultMove (je n'arrivais pas à le faire marcher) et l'ai remplacé par le try/catch
    await photoForm.mv(photoPath);

    // on définit le dossier d'enregistrement en fonction du param de la route
    const folder = photoForm.name === "user" ? "Users" : "Fails";
    // téléversement dans Cloudinary
    const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
      folder: folder,
    });

    // suppression du fichier temporaire
    fs.unlinkSync(photoPath);

    return { result: true, url: resultCloudinary.secure_url };
  } catch (error) {
    return { result: false, error: "Error while uploading the photo:" + error };
  }
}

module.exports = { uploadPhoto };
