const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const { Storage } = require("@google-cloud/storage");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const bucketName = process.env.GCS_BUCKET_NAME;

app.use(cors());
app.use(express.json());

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json",
});

const bucket = storage.bucket(bucketName);

const uploadedFiles = [];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function formatFileDetails(file, cloudFileName) {
  return {
    originalName: file.originalname,
    fileName: cloudFileName,
    size: file.size,
    mimeType: file.mimetype,
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
    if (!bucketName) {
      return res.status(500).json({ message: "GCS_BUCKET_NAME is missing in .env file." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please choose a file to upload." });
    }

    const cloudFileName = getSafeFileName(req.file.originalname);
    const gcsFile = bucket.file(cloudFileName);

    await gcsFile.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    const fileDetails = formatFileDetails(req.file, cloudFileName);
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
    if (!bucketName) {
      return res.status(500).json({ message: "GCS_BUCKET_NAME is missing in .env file." });
    }

    const fileName = req.params.fileName;
    const gcsFile = bucket.file(fileName);

    const [exists] = await gcsFile.exists();

    if (!exists) {
      return res.status(404).json({ message: "File not found in cloud storage." });
    }

    const [signedUrl] = await gcsFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });

    res.json({
      message: "Signed URL generated successfully.",
      downloadUrl: signedUrl,
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
    if (!bucketName) {
      return res.status(500).json({ message: "GCS_BUCKET_NAME is missing in .env file." });
    }

    const fileName = req.params.fileName;
    const gcsFile = bucket.file(fileName);

    const [exists] = await gcsFile.exists();

    if (!exists) {
      return res.status(404).json({ message: "File not found in cloud storage." });
    }

    await gcsFile.delete();

    const fileIndex = uploadedFiles.findIndex((file) => file.fileName === fileName);

    if (fileIndex !== -1) {
      uploadedFiles.splice(fileIndex, 1);
    }

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
