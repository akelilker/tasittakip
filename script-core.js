/* =========================================
   TAŞIT YÖNETİM SİSTEMİ - CORE SCRIPT
   ========================================= */

function toggleSettingsMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('settings-menu');
  const notif = document.getElementById('notifications-dropdown');
  if (notif) notif.classList.remove('open');
  if (menu) menu.classList.toggle('open');
}

function toggleNotifications(e) {
  e.stopPropagation();
  const notif = document.getElementById('notifications-dropdown');
  const menu = document.getElementById('settings-menu');
  if (menu) menu.classList.remove('open');
  if (notif) notif.classList.toggle('open');
}

function showDataSubmenu() {
  const submenu = document.getElementById('data-submenu');
  if (submenu) submenu.classList.add('open');
}

function hideDataSubmenu(e) {
  const submenu = document.getElementById('data-submenu');
  if (!submenu) return;
  const next = e && e.relatedTarget ? e.relatedTarget : null;
  if (next && (submenu.contains(next) || (e.currentTarget && e.currentTarget.contains(next)))) {
    return;
  }
  submenu.classList.remove('open');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('settings-menu');
  const notif = document.getElementById('notifications-dropdown');
  const submenu = document.getElementById('data-submenu');
  
  // Settings menu içindeki click'leri ignore et (butonlar çalışsın)
  if (menu && menu.contains(e.target)) {
    return; 
  }
  
  // Submenu içindeki click'leri de ignore et
  if (submenu && submenu.contains(e.target)) {
    return;
  }
  
  // Dışarı tıklandığında menüleri kapat
  if (menu && menu.classList.contains('open')) {
    menu.classList.remove('open');
  }
  if (notif && notif.classList.contains('open')) {
    notif.classList.remove('open');
  }
  if (submenu && submenu.classList.contains('open')) {
    submenu.classList.remove('open');
  }
});

/* =========================================
   MODAL MANAGER (Global)
   ========================================= */
// Footer dim kontrolü fonksiyonu (Global)
let dimTimeout = null;

// Sayfa yüklendiğinde footer animasyonunu başlat
function startFooterAnimation() {
  const footer = document.getElementById('app-footer');
  if (!footer) {
    // Footer bulunamadı
    return;
  }
  
  // Önceki timeout'u temizle
  if (dimTimeout) {
    clearTimeout(dimTimeout);
    dimTimeout = null;
  }
  
  // Başta dimmed ekle (versiyon ve durum normal, MEDISA soluk)
  footer.classList.add('dimmed');
  footer.classList.remove('delayed');
  // Footer animasyonu başladı
  
  // 4 saniye sonra delayed class'ını ekle (versiyon ve durum soluk, MEDISA normal)
  dimTimeout = setTimeout(() => {
    if (footer) {
      footer.classList.add('delayed');
      // Footer animasyonu tamamlandı
    }
  }, 4000);
}

// Modal kontrolü için ayrı fonksiyon
window.updateFooterDim = function() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;
  
  let isAnyModalOpen = false;
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    if (modal.classList.contains('active') || modal.style.display === 'flex') {
      isAnyModalOpen = true;
    }
  });

  if (isAnyModalOpen) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Sayfa yüklendiğinde footer animasyonunu başlat
  startFooterAnimation();
  
  // Modal kontrolü için ilk kontrol
  window.updateFooterDim();
  
  // Modal Observer: Body class yönetimi (Scroll engelleme vb.)
  const modalObserver = new MutationObserver((mutations) => {
    window.updateFooterDim();
  });

  // Tüm modalları izlemeye başla
  const allModals = document.querySelectorAll('.modal-overlay');
  allModals.forEach(modal => {
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
  });
  
  // Dinamik eklenen modallar için de izle
  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList && node.classList.contains('modal-overlay')) {
          modalObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
        }
      });
    });
  });
  
  bodyObserver.observe(document.body, { childList: true, subtree: true });
});

// Modal açma fonksiyonlarını override et (Global Erişim için)
(function() {
  window.openVehiclesView = function() { 
    const modal = document.getElementById('vehicles-modal');
    if (modal) {
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.classList.add('active');
        setTimeout(() => window.updateFooterDim(), 100); // Footer'ı güncelle
      });
    }
  };
  
  window.openReportsView = function() {
    const modal = document.getElementById('reports-modal');
    if (modal) {
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.classList.add('active');
        setTimeout(() => window.updateFooterDim(), 100); // Footer'ı güncelle
      });
    }
  };
  
  window.closeVehiclesModal = function() {
    const modal = document.getElementById('vehicles-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        setTimeout(() => window.updateFooterDim(), 100); // Footer'ı güncelle
      }, 300);
    }
  };
  
  window.closeReportsModal = function() {
    const modal = document.getElementById('reports-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        setTimeout(() => window.updateFooterDim(), 100); // Footer'ı güncelle
      }, 300);
    }
  };
})();

/* =========================================
   VERSION DISPLAY (Global Core - v78.1)
   ========================================= */
document.addEventListener('DOMContentLoaded', function() {
    const APP_VERSION = "v78.1";
    const versionEl = document.getElementById('version-display');

    if (versionEl) {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        // iOS Tespiti
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        // Mobil Tespiti
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        // PWA Tespiti
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);

        let suffix = "";
        if (isPWA) {
            suffix = isIOS ? " iOS PWA" : " PWA";
        } else if (isMobile) {
            suffix = " Mobil";
        }
        // Masaüstü ise suffix boş kalır

        versionEl.textContent = APP_VERSION + suffix;
    }

    // Bildirimleri güncelle (sayfa yüklendiğinde)
    setTimeout(() => {
      if (window.updateNotifications) window.updateNotifications();
    }, 1000);

    // Loading screen'i kapat
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 300);
    }
});

/* =========================================
   LOADING SCREEN CLOSE (fallback'lar: load event + dataLoaded + timeout)
   ========================================= */
function hideLoadingScreenIfVisible() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
    loadingScreen.classList.add('hidden');
    setTimeout(function() { loadingScreen.style.display = 'none'; }, 300);
  }
}

// Sayfa tam yüklendiğinde hâlâ açıksa kapat
window.addEventListener('load', hideLoadingScreenIfVisible);

// Veri yüklendikten sonra da kapat (/medisa/ load.php 404 olsa bile dataLoaded tetiklenir)
window.addEventListener('dataLoaded', function() {
  setTimeout(hideLoadingScreenIfVisible, 50);
});

// 8 saniye sonra zorla kapat (script 404 / ağ hatası durumunda spinner takılmasın)
setTimeout(hideLoadingScreenIfVisible, 8000);

/* =========================================
   SERVICE WORKER REGISTRATION
   ========================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service Worker kaydını güvenli şekilde dene
    // Önce mevcut dizinde dene, sonra root'ta dene
    const swPaths = ['./sw.js', '/sw.js', '/medisa/sw.js'];
    let currentPathIndex = 0;
    
    function tryRegisterSW() {
      if (currentPathIndex >= swPaths.length) {
        // Tüm path'ler denendi, sessizce devam et
        return;
      }
      
      const swPath = swPaths[currentPathIndex];
      navigator.serviceWorker.register(swPath, { scope: './' })
        .then((registration) => {
          // Yeni service worker varsa güncelle
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Yeni service worker mevcut
              }
            });
          });
        })
        .catch((error) => {
          // 404 veya diğer hatalar - bir sonraki path'i dene
          if (error.message && (
            error.message.includes('404') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('bad HTTP response code')
          )) {
            currentPathIndex++;
            tryRegisterSW();
          } else if (error.message && (error.message.includes('redirect') || error.message.includes('Redirect'))) {
            // Redirect hatası - bir sonraki path'i dene
            currentPathIndex++;
            tryRegisterSW();
          } else if (error.name === 'SecurityError') {
            // Güvenlik hatası - bir sonraki path'i dene
            currentPathIndex++;
            tryRegisterSW();
          } else {
            // Diğer hatalar - bir sonraki path'i dene
            currentPathIndex++;
            tryRegisterSW();
          }
        });
    }
    
    tryRegisterSW();
  });
}

/* =========================================
   MANIFEST.JSON CORS HATASI YÖNETİMİ
   ========================================= */
// Manifest.json CORS/404 hatası için sessizce devam et
// Bu hata PWA özelliklerini etkileyebilir ama uygulama çalışmaya devam eder
(function() {
  // Error event listener - manifest.json hatalarını yakala (sessizce)
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Manifest.json ile ilgili hataları filtrele
    if (message && typeof message === 'string' && (
      message.includes('manifest.json') ||
      message.includes('CORS') ||
      message.includes('blocked')
    )) {
      return true; // Hata handle edildi, sessizce devam et
    }
    // Diğer hataları normal şekilde işle
    if (originalError) {
      return originalError.apply(this, arguments);
    }
    return false;
  };
  
  // Link element error'ları için
  document.addEventListener('error', (event) => {
    if (event.target && event.target.tagName === 'LINK' && event.target.rel === 'manifest') {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);
  
  // Unhandled promise rejection'ları için
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (reason.message && reason.message.includes('manifest.json')) ||
      (reason.message && reason.message.includes('CORS')) ||
      (reason.message && reason.message.includes('blocked'))
    )) {
      event.preventDefault(); // Sessizce handle et
    }
  });
})();

/* =========================================
   EXCELJS LAZY LOAD
   ========================================= */
window.loadExcelJS = function() {
  return new Promise((resolve, reject) => {
    // Zaten yüklüyse direkt dön
    if (typeof ExcelJS !== 'undefined' || typeof window.ExcelJS !== 'undefined') {
      resolve(ExcelJS || window.ExcelJS);
      return;
    }
    
    // Script yükleniyorsa bekle
    if (window.excelJSLoading) {
      window.excelJSLoading.then(resolve).catch(reject);
      return;
    }
    
    // Script'i yükle
    window.excelJSLoading = new Promise((res, rej) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      script.onload = () => {
        resolve(ExcelJS || window.ExcelJS);
        res(ExcelJS || window.ExcelJS);
      };
      script.onerror = () => {
        const err = new Error('ExcelJS yüklenemedi');
        reject(err);
        rej(err);
      };
      document.head.appendChild(script);
    });
    
    window.excelJSLoading.then(resolve).catch(reject);
  });
};
