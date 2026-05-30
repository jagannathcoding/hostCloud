const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const path = require("path");

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

function formatCloudinaryResource(resource) {
  const hasExtension =
    resource.original_filename &&
    resource.format &&
    resource.original_filename.toLowerCase().endsWith(`.${resource.format.toLowerCase()}`);
  const resolvedOriginalName = hasExtension
    ? resource.original_filename
    : resource.format
      ? `${resource.original_filename || resource.filename || resource.public_id}.${resource.format}`
      : resource.original_filename || resource.filename || resource.public_id;

  return {
    originalName: resolvedOriginalName,
    fileName: resource.public_id,
    size: resource.bytes,
    mimeType: resource.format ? `${resource.resource_type}/${resource.format}` : resource.resource_type,
    downloadUrl: resource.secure_url,
    resourceType: resource.resource_type,
    uploadDate: resource.created_at,
  };
}

function getSafeFileName(originalName) {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const cleanedBaseName = baseName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "");
  return `${Date.now()}-${cleanedBaseName}`;
}

async function getCloudinaryResource(publicId) {
  const resourceTypes = ["raw", "image", "video"];

  for (const resourceType of resourceTypes) {
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });
      return resource;
    } catch (error) {
      const statusCode = error?.http_code || error?.statusCode;
      if (statusCode !== 404) {
        throw error;
      }
    }
  }

  return null;
}

function getRequestedResourceTypes(resourceTypeFromQuery) {
  const validTypes = ["image", "video", "raw"];
  if (resourceTypeFromQuery && validTypes.includes(resourceTypeFromQuery)) {
    return [resourceTypeFromQuery];
  }
  return validTypes;
}

function resolveAttachmentName(resource) {
  const publicIdBaseName = (resource.public_id || "file").split("/").pop();
  const baseName = resource.original_filename || resource.filename || publicIdBaseName || "file";
  const hasExtension =
    resource.format &&
    baseName.toLowerCase().endsWith(`.${resource.format.toLowerCase()}`);
  if (hasExtension) {
    return baseName;
  }
  return resource.format ? `${baseName}.${resource.format}` : baseName;
}

function sanitizeFileName(fileName) {
  return (fileName || "file")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureExtension(fileName, resource) {
  const safeName = sanitizeFileName(fileName);
  if (!resource?.format) {
    return safeName;
  }
  const lowerSafeName = safeName.toLowerCase();
  const lowerExt = `.${resource.format.toLowerCase()}`;
  if (lowerSafeName.endsWith(lowerExt)) {
    return safeName;
  }
  return `${safeName}${lowerExt}`;
}

async function getCloudinaryResourceByTypes(publicId, resourceTypes) {
  for (const resourceType of resourceTypes) {
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });
      return resource;
    } catch (error) {
      const statusCode = error?.http_code || error?.statusCode;
      if (statusCode !== 404) {
        throw error;
      }
    }
  }

  return null;
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
          filename_override: req.file.originalname,
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

app.get("/api/files", async (req, res) => {
  try {
    const folder = process.env.CLOUDINARY_FOLDER;
    const resourceTypes = ["raw", "image", "video"];
    const allResources = [];

    for (const resourceType of resourceTypes) {
      const result = await cloudinary.api.resources({
        type: "upload",
        resource_type: resourceType,
        prefix: folder ? `${folder}/` : undefined,
        max_results: 200,
      });
      allResources.push(...result.resources);
    }

    const files = allResources
      .map(formatCloudinaryResource)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    res.json(files);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch files.",
      error: error.message,
    });
  }
});

app.get("/api/download/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const requestedTypes = getRequestedResourceTypes(req.query.resourceType);
    const resource = await getCloudinaryResourceByTypes(fileName, requestedTypes);

    if (!resource) {
      return res.status(404).json({ message: "File not found." });
    }

    const requestedName = req.query.downloadName
      ? sanitizeFileName(req.query.downloadName)
      : null;
    const attachmentName = ensureExtension(
      requestedName || resolveAttachmentName(resource),
      resource
    );
    const downloadUrl = cloudinary.utils.private_download_url(
      resource.public_id,
      resource.format || undefined,
      {
        resource_type: resource.resource_type,
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
        attachment: attachmentName,
      }
    );

    const fallbackUrl = cloudinary.url(resource.public_id, {
      resource_type: resource.resource_type,
      type: "upload",
      secure: true,
      flags: `attachment:${attachmentName}`,
      format: resource.format || undefined,
    });

    res.json({
      message: "Download URL generated successfully.",
      downloadUrl,
      fallbackUrl,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate download URL.",
      error: error?.message || "Unknown download error",
    });
  }
});

app.delete("/api/delete/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const requestedTypes = getRequestedResourceTypes(req.query.resourceType);
    const resource = await getCloudinaryResourceByTypes(fileName, requestedTypes);

    if (!resource) {
      return res.status(404).json({ message: "File not found." });
    }

    const deleteResult = await cloudinary.uploader.destroy(resource.public_id, {
      resource_type: resource.resource_type,
      type: "upload",
      invalidate: true,
    });

    if (deleteResult.result !== "ok") {
      return res.status(500).json({ message: "Failed to delete file from Cloudinary." });
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
