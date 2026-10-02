import { apiBase, request } from "./request.js";

function normalizeUploadPath(input) {
  return String(input || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("/");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error || new Error("Không đọc được file"));
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(file);
  });
}

export const storage = {
  from() {
    return {
      async upload(path, file) {
        try {
          const normalizedPath = normalizeUploadPath(path);
          const data = await fileToBase64(file);
          const result = await request("/api/upload", {
            method: "POST",
            body: {
              path: normalizedPath,
              contentType: file.type || "application/octet-stream",
              data,
            },
          });
          return { data: { path: result.path }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },

      getPublicUrl(path) {
        const safePath = normalizeUploadPath(path)
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/");

        return {
          data: { publicUrl: `${apiBase()}/uploads/${safePath}` },
        };
      },
    };
  },
};
