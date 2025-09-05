// Upload une photo dans Cloudinary

const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const sharp = require("sharp"); // pour réduire les photos si plus de 10 Mo

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

    let photoPath = `./tmp/${uniqid()}.jpg`;
    // on met une copie de la photo dans le dossier tmp
    // J'ai retiré le resultMove (je n'arrivais pas à le faire marcher) et l'ai remplacé par le try/catch
    await photoForm.mv(photoPath);

    // compression si taille > 10 Mo
    if (photoForm.size > 10 * 1024 * 1024) {
      const compressedPath = `./tmp/${uniqid()}_compressed.jpg`;
      await sharp(photoPath).jpeg({ quality: 80 }).toFile(compressedPath);
      photoPath = compressedPath; 
    }

    // on définit le dossier d'enregistrement en fonction du param de la route
    const folder = photoForm.name === "user" ? "Users" : "Fails";

    // téléversement dans Cloudinary
    const resultCloudinary = await cloudinary.uploader.upload(photoPath, {
      folder: folder,
    });
    console.log("resultCloudinary", resultCloudinary);

    // suppression du fichier temporaire
    fs.unlinkSync(photoPath);

    return { result: true, url: resultCloudinary.secure_url };
  } catch (error) {
    return { result: false, error: "Error while uploading the photo:" + error };
  }
}

module.exports = { uploadPhoto };
