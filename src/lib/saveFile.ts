export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hands a file to the user.
 * - On iPhone: opens the share sheet ("Save to Files", AirDrop, Calendar…),
 *   because plain downloads are unreliable inside a home-screen app.
 * - On desktop: a normal download.
 * Used for JSON backups now and the .ics calendar export later.
 */
export async function saveFile(name: string, blob: Blob): Promise<SaveResult> {
  const file = new File([blob], name, { type: blob.type });
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason; fall back to a download below.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
