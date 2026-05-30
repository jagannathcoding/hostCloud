const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadedFiles = [];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function formatFileDetails(file, uploadResult) {
  return {
    originalName: file.originalname,
    fileName: uploadResult.public_id,
    size: file.size,
    mimeType: file.mimetype,
    downloadUrl: uploadResult.secure_url,
    resourceType: uploadResult.resource_type,
    uploadDate: new Date().toISOString(),
  };
}

function getSafeFileName(originalName) {
  const cleanedName = originalName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return `${Date.now()}-${cleanedName}`;
}

app.get("/", (req, res) => {
  res.send("Cloud File Transfer Backend Running");
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: "Cloudinary credentials are missing in .env file." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please choose a file to upload." });
    }

    const cloudFileName = getSafeFileName(req.file.originalname);
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: cloudFileName,
          folder: process.env.CLOUDINARY_FOLDER || undefined,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const fileDetails = formatFileDetails(req.file, uploadResult);
    uploadedFiles.unshift(fileDetails);

    res.status(201).json({
      message: "File uploaded successfully.",
      file: fileDetails,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to upload file.",
      error: error.message,
    });
  }
});

app.get("/api/files", (req, res) => {
  res.json(uploadedFiles);
});

app.get("/api/download/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const fileDetails = uploadedFiles.find((file) => file.fileName === fileName);

    if (!fileDetails) {
      return res.status(404).json({ message: "File not found." });
    }

    res.json({
      message: "Download URL generated successfully.",
      downloadUrl: fileDetails.downloadUrl,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate download URL.",
      error: error.message,
    });
  }
});

app.delete("/api/delete/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const fileIndex = uploadedFiles.findIndex((file) => file.fileName === fileName);

    if (fileIndex === -1) {
      return res.status(404).json({ message: "File not found." });
    }

    const fileDetails = uploadedFiles[fileIndex];
    const deleteResult = await cloudinary.uploader.destroy(fileDetails.fileName, {
      resource_type: fileDetails.resourceType || "raw",
    });

    if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
      return res.status(500).json({ message: "Failed to delete file from Cloudinary." });
    }
    uploadedFiles.splice(fileIndex, 1);

    res.json({ message: "File deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete file.",
      error: error.message,
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File size must be 10 MB or less." });
  }

  next(error);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
