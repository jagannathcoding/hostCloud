const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  (import.meta.env.PROD ? "" : "http://localhost:5000");

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload file.");
  }

  return data;
}

export async function getFiles() {
  const response = await fetch(`${API_BASE_URL}/api/files`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch files.");
  }

  return data;
}

export async function getDownloadUrl(fileName, resourceType, originalName) {
  const params = new URLSearchParams();
  if (resourceType) {
    params.set("resourceType", resourceType);
  }
  if (originalName) {
    params.set("downloadName", originalName);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(
    `${API_BASE_URL}/api/download/${encodeURIComponent(fileName)}${query}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to generate download URL.");
  }

  return data;
}

export async function deleteFile(fileName, resourceType) {
  const query = resourceType
    ? `?resourceType=${encodeURIComponent(resourceType)}`
    : "";
  const response = await fetch(
    `${API_BASE_URL}/api/delete/${encodeURIComponent(fileName)}${query}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete file.");
  }

  return data;
}
