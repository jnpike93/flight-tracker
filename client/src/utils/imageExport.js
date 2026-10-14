import html2canvas from 'html2canvas-pro';

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
 * Render a DOM element to an HTML5 Canvas using html2canvas-pro with optimal settings.
 * html2canvas-pro includes full support for modern CSS color spaces like oklch() used in Tailwind v4.
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
      scrollY: 0
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
  a.rel = 'noopener';
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
 * 2. On desktop (Chrome, Safari, Edge, Firefox):
 *    - Safari: Uses synchronous ClipboardItem(Promise<Blob>) to satisfy WebKit gesture constraints.
 *    - Chrome/Edge: Writes ClipboardItem(Blob) directly or falls back to file download.
 *    - Firefox/Restricted: When clipboard image writing is blocked by browser policy, saves image directly to Downloads.
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

  if (typeof window !== 'undefined' && window.focus) {
    try {
      window.focus();
    } catch {
      // ignore
    }
  }

  const isMobile = isMobileDevice();
  const hasShare = canShareFiles();

  // STRATEGY 1: Mobile device with native Web Share API
  // On iOS Safari / Android Chrome, opening the native share sheet allows the user
  // to tap "Copy", "Save Image" to Photos, or share directly to any app.
  if (isMobile && hasShare) {
    let capturedBlob = null;
    try {
      const canvas = await renderElementToCanvas(element, options);
      capturedBlob = await canvasToBlob(canvas);
      const file = new File([capturedBlob], fileName, { type: 'image/png' });

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
      if (capturedBlob) {
        downloadBlob(capturedBlob, fileName);
        return { ok: true, status: 'downloaded' };
      }
      return { ok: false, status: 'error', error: shareErr };
    }
  }

  // STRATEGY 2: Desktop Clipboard with fallback
  let renderedBlob = null;

  // We initiate the async render
  const blobPromise = (async () => {
    const canvas = await renderElementToCanvas(element, options);
    const blob = await canvasToBlob(canvas);
    renderedBlob = blob;
    return blob;
  })();

  // In Safari (WebKit) and modern Chromium:
  // Test if ClipboardItem accepts a Promise constructor synchronously inside the click gesture
  if (typeof window !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({ 'image/png': blobPromise });
      await navigator.clipboard.write([item]);
      return { ok: true, status: 'copied' };
    } catch (promiseClipErr) {
      console.warn('ClipboardItem promise write did not succeed, awaiting direct blob:', promiseClipErr);
    }
  }

  // Await the rendered blob for direct methods
  try {
    if (!renderedBlob) {
      renderedBlob = await blobPromise;
    }
  } catch (renderErr) {
    console.error('Snapshot rendering failed:', renderErr);
    return { ok: false, status: 'error', error: renderErr };
  }

  // Try direct blob clipboard write
  if (typeof window !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
    try {
      const directItem = new ClipboardItem({ 'image/png': renderedBlob });
      await navigator.clipboard.write([directItem]);
      return { ok: true, status: 'copied' };
    } catch (directClipErr) {
      console.warn('Direct blob clipboard write failed (browser may restrict clipboard images):', directClipErr);
    }
  }

  // Try Web Share if available (e.g. macOS Safari)
  if (hasShare) {
    try {
      const file = new File([renderedBlob], fileName, { type: 'image/png' });
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

  // Safe fallback: download the already rendered blob directly to user's device
  try {
    downloadBlob(renderedBlob, fileName);
    return { ok: true, status: 'downloaded' };
  } catch (dlErr) {
    console.error('Download fallback failed:', dlErr);
    return { ok: false, status: 'error', error: dlErr };
  }
}
