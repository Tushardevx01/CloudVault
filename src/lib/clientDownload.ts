import { S3FileItem } from "@/types/file";

export async function downloadCloudFile(
  file: S3FileItem
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(
      `/api/files/download?key=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.originalName)}&json=true`
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.downloadUrl) {
      return {
        ok: false,
        status: res.status,
        error: data.error || "Failed to generate download link.",
      };
    }

    const a = document.createElement("a");
    a.href = data.downloadUrl;
    a.download = file.originalName;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { ok: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      ok: false,
      status: 0,
      error: error.message || "Network error while requesting file download.",
    };
  }
}
