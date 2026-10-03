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
          if (!file) throw new Error("Chưa chọn file.");
          if (file.size > 8 * 1024 * 1024) {
            throw new Error("Ảnh vượt quá 8 MB.");
          }
          const allowedTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ]);
          if (file.type && !allowedTypes.has(file.type)) {
            throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
          }

          const normalizedPath = normalizeUploadPath(path);
          if (!normalizedPath) throw new Error("Tên file không hợp lệ.");
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
