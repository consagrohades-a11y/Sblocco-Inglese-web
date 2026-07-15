const DOWNLOAD_REVOKE_DELAY_MS = 2000;

let installed = false;

export function installDownloadCompatibility() {
  if (installed || typeof window === 'undefined') return;

  const urlApi = window.URL;
  if (!urlApi || typeof urlApi.revokeObjectURL !== 'function') return;

  const originalRevokeObjectUrl = urlApi.revokeObjectURL.bind(urlApi);

  // Some browsers can cancel a download when the Blob URL is revoked in the
  // same synchronous click handler that started it. Keep the temporary URL
  // alive briefly, then release it normally.
  urlApi.revokeObjectURL = (objectUrl) => {
    window.setTimeout(() => {
      try {
        originalRevokeObjectUrl(objectUrl);
      } catch {
        // The browser may already have released the URL. Nothing else is needed.
      }
    }, DOWNLOAD_REVOKE_DELAY_MS);
  };

  installed = true;
}
