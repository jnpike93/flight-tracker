import html2canvas from 'html2canvas';

/**
 * Detect whether the client is a mobile device (iOS, Android, iPadOS).
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isTouchMac;
}

/**
 * Detect whether Web Share API supports file sharing.
 */
export function canShareFiles() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File([new Uint8Array(1)], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Render a DOM element to an HTML5 Canvas using html2canvas with optimal settings.
 */
export async function renderElementToCanvas(element, customOptions = {}) {
  if (!element) throw new Error('Target element is null or undefined');

  // Wait for web fonts so labels and monospaced digits render crisply
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font loading times out
    }
  }

  // If container is horizontally scrolled, temporarily reset it to 0 so the canvas doesn't crop
  const parentScrollable = element.parentElement;
  const originalScrollLeft = parentScrollable ? parentScrollable.scrollLeft : 0;
  if (parentScrollable && originalScrollLeft > 0) {
    parentScrollable.scrollLeft = 0;
  }

  try {
    const defaultOptions = {
      backgroundColor: '#020617', // slate-950
      scale: 2, // 2x retina crisp rendering
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth || undefined,
      windowHeight: element.scrollHeight || undefined
    };

    return await html2canvas(element, { ...defaultOptions, ...customOptions });
  } finally {
    if (parentScrollable && originalScrollLeft > 0) {
      parentScrollable.scrollLeft = originalScrollLeft;
    }
  }
}

/**
 * Convert HTML5 Canvas to a PNG Blob via Promise.
 */
export function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, type, quality);
  });
}

/**
 * Download a Blob directly to the user's Downloads folder without re-rendering.
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Render and download an element as an image file.
 */
export async function downloadElementAsImage(element, fileName = 'aerolog-snapshot.png', options = {}) {
  const canvas = await renderElementToCanvas(element, options);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, fileName);
  return { ok: true, status: 'downloaded' };
}

/**
 * Export, copy, or share an element image.
 *
 * Strategies:
 * 1. On mobile devices with Web Share API file support:
 *    Triggers native OS Share Sheet (which provides "Copy", "Save Image", Messages, etc.).
 * 2. On desktop (Chrome 124+, Safari, Edge):
 *    Synchronously writes a ClipboardItem Promise to preserve the user-activation token.
 * 3. Fallback for older Chromium / Firefox:
 *    Attempts direct Blob Clipboard write, then Web Share, and finally direct Blob download.
 *
 * Returns: { ok: boolean, status: 'copied' | 'shared' | 'downloaded' | 'aborted' | 'error', error?: any }
 */
export async function exportOrCopyImage({
  element,
  fileName = 'aerolog-snapshot.png',
  shareTitle = 'AeroLog Flight Stats',
  shareText = 'Check out my flight stats on AeroLog!',
  options = {}
}) {
  if (!element) return { ok: false, status: 'error', error: new Error('Element missing') };

  const isMobile = isMobileDevice();
  const hasShare = canShareFiles();

  // STRATEGY 1: Mobile device with native Web Share API
  // On iOS Safari / Android Chrome, opening the native share sheet allows the user
  // to tap "Copy", "Save Image" to Photos, or share directly to any app.
  if (isMobile && hasShare) {
    try {
      const canvas = await renderElementToCanvas(element, options);
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], fileName, { type: 'image/png' });

      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText
      });
      return { ok: true, status: 'shared' };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        // User cancelled the share sheet intentionally
        return { ok: false, status: 'aborted' };
      }
      console.warn('Mobile Web Share failed, falling back to download:', shareErr);
      // Fallback: If share threw, download the image directly
      try {
        const canvas = await renderElementToCanvas(element, options);
        const blob = await canvasToBlob(canvas);
        downloadBlob(blob, fileName);
        return { ok: true, status: 'downloaded' };
      } catch (dlErr) {
        return { ok: false, status: 'error', error: dlErr };
      }
    }
  }

  // STRATEGY 2: Desktop Clipboard with Promise<Blob> (Safari & Chromium 124+)
  // Safari strictly demands `navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])`
  // called synchronously within the user gesture before the async canvas render finishes.
  if (typeof window !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
    let capturedBlob = null;
    const blobPromise = (async () => {
      const canvas = await renderElementToCanvas(element, options);
      const blob = await canvasToBlob(canvas);
      capturedBlob = blob;
      return blob;
    })();

    try {
      // Test if ClipboardItem accepts a Promise constructor without throwing
      const item = new ClipboardItem({ 'image/png': blobPromise });
      await navigator.clipboard.write([item]);
      return { ok: true, status: 'copied' };
    } catch (promiseClipErr) {
      console.warn('ClipboardItem promise write did not succeed:', promiseClipErr);

      // Wait for blob promise if not yet resolved
      try {
        if (!capturedBlob) {
          capturedBlob = await blobPromise;
        }

        // Try direct blob write (for Chromium <124 where Promise in ClipboardItem throws TypeError)
        const directItem = new ClipboardItem({ 'image/png': capturedBlob });
        await navigator.clipboard.write([directItem]);
        return { ok: true, status: 'copied' };
      } catch (directClipErr) {
        console.warn('Direct blob clipboard write failed:', directClipErr);

        // Try Web Share if available on desktop (e.g. macOS Safari)
        if (hasShare) {
          try {
            const file = new File([capturedBlob], fileName, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText
            });
            return { ok: true, status: 'shared' };
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
              return { ok: false, status: 'aborted' };
            }
          }
        }

        // Fallback: Download already captured blob directly (e.g. Firefox default clipboard policy)
        if (capturedBlob) {
          downloadBlob(capturedBlob, fileName);
          return { ok: true, status: 'downloaded' };
        }
      }
    }
  }

  // STRATEGY 3: General Fallback (Render once, attempt share, otherwise download)
  try {
    const canvas = await renderElementToCanvas(element, options);
    const blob = await canvasToBlob(canvas);

    if (hasShare) {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText
        });
        return { ok: true, status: 'shared' };
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return { ok: false, status: 'aborted' };
        }
      }
    }

    downloadBlob(blob, fileName);
    return { ok: true, status: 'downloaded' };
  } catch (err) {
    console.error('Snapshot capture failed:', err);
    return { ok: false, status: 'error', error: err };
  }
}
