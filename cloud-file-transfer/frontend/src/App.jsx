import { useEffect, useState } from "react";
import { deleteFile, getDownloadUrl, getFiles, uploadFile } from "./api";

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function loadFiles() {
    try {
      const files = await getFiles();
      setUploadedFiles(files);
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  function showMessage(text, type) {
    setMessage(text);
    setMessageType(type);
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    setSelectedFile(file || null);
    setMessage("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      showMessage("Please choose a file first.", "error");
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const result = await uploadFile(selectedFile);
      showMessage(result.message, "success");
      setSelectedFile(null);
      document.getElementById("fileInput").value = "";
      loadFiles();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(fileName) {
    try {
      const result = await getDownloadUrl(fileName);
      window.open(result.downloadUrl, "_blank");
      showMessage("Download link created successfully.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleDelete(fileName) {
    try {
      const result = await deleteFile(fileName);
      showMessage(result.message, "success");
      setUploadedFiles((currentFiles) =>
        currentFiles.filter((file) => file.fileName !== fileName)
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-xl md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">
            Cloud File Transfer System
          </h1>
          <p className="mt-3 text-sm text-slate-500 md:text-base">
            Upload, store, download and delete files
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <label
            htmlFor="fileInput"
            className="mb-3 block text-sm font-semibold text-slate-700"
          >
            Choose a file
          </label>

          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Maximum file size: 10 MB
            </p>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
                messageType === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Uploaded Files</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-500">
              No files uploaded yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.fileName}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="truncate text-lg font-semibold text-slate-800">
                    {file.originalName}
                  </h3>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-700">File size:</span>{" "}
                      {formatFileSize(file.size)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">File type:</span>{" "}
                      {file.mimeType || "Unknown"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Upload date:</span>{" "}
                      {formatDate(file.uploadDate)}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => handleDownload(file.fileName)}
                      className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.fileName)}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
