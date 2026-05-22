/**
 * Global Head Initializer
 * Injects common <head> resources once for all pages
 * Reduces ~20KB of redundant code across the site
 */

(function initHeadResources() {
  // Don't re-inject if already loaded
  if (document.getElementById('head-init-completed')) return;

  const head = document.head;

  // Helper to check if resource already exists
  const resourceExists = (selector) => document.querySelector(selector) !== null;

  // 1. FAVICON ICONS (if not already present)
  if (!resourceExists('link[rel="shortcut icon"]')) {
    const favicons = [
      { rel: 'shortcut icon', href: '/images/favicon/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/images/favicon/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/favicon/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/images/favicon/favicon-16x16.png' }
    ];
    favicons.forEach(attrs => {
      const link = document.createElement('link');
      Object.assign(link, attrs);
      head.appendChild(link);
    });
  }

  // 2. BOOTSTRAP CSS (if not present)
  if (!resourceExists('link[href*="bootstrap"][href*=".css"]')) {
    const bootstrap = document.createElement('link');
    bootstrap.rel = 'stylesheet';
    bootstrap.crossOrigin = 'anonymous';
    bootstrap.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
    head.appendChild(bootstrap);
  }

  // 3. GOOGLE FONTS PRECONNECT (if not present)
  if (!resourceExists('link[href*="fonts.googleapis"]')) {
    const fontsGoogle = document.createElement('link');
    fontsGoogle.rel = 'preconnect';
    fontsGoogle.href = 'https://fonts.googleapis.com';
    head.appendChild(fontsGoogle);

    const fontStatic = document.createElement('link');
    fontStatic.rel = 'preconnect';
    fontStatic.href = 'https://fonts.gstatic.com';
    fontStatic.crossOrigin = '';
    head.appendChild(fontStatic);
  }

  // 4. GLOBAL STYLESHEET (if not present)
  if (!resourceExists('link[href="/css/dacStyleSheets.css"]')) {
    const globalCSS = document.createElement('link');
    globalCSS.rel = 'stylesheet';
    globalCSS.href = '/css/dacStyleSheets.css?v=1.4';
    head.appendChild(globalCSS);
  }

  // 5. PRINT STYLESHEET (if not present)
  if (!resourceExists('link[href="/css/dacPrint.css"]')) {
    const printCSS = document.createElement('link');
    printCSS.rel = 'stylesheet';
    printCSS.media = 'print';
    printCSS.href = '/css/dacPrint.css';
    printCSS.type = 'text/css';
    head.appendChild(printCSS);
  }

  // 6. FONTAWESOME CDN (if not present)
  if (!resourceExists('link[href*="font-awesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    head.appendChild(fontAwesome);
  }

  // Mark as initialized
  const marker = document.createElement('meta');
  marker.id = 'head-init-completed';
  marker.name = 'head-init-status';
  marker.content = 'loaded';
  head.appendChild(marker);

  console.log('✓ Global head resources initialized');
})();
