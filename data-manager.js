/* =========================================
   SUNUCU VERİ YÖNETİMİ - DATA MANAGER
   ========================================= */

// API Base: /tasitmedisa/ veya /medisa/ altındaysa mutlak yol kullan (404 önleme)
const API_BASE = (function() {
    try {
        var p = (typeof document !== 'undefined' && document.location && document.location.pathname) ? document.location.pathname : '';
        if (p.indexOf('/tasitmedisa') === 0) return '/tasitmedisa/';
        if (p.indexOf('/medisa') === 0) return '/medisa/';
        return '';
    } catch (e) { return ''; }
})();
const API_LOAD = API_BASE + 'load.php';
const API_SAVE = API_BASE + 'save.php';

// Global veri nesnesi (arac_aylik_hareketler, duzeltme_talepleri driver/admin PHP'leri için korunur)
window.appData = {
    tasitlar: [],
    kayitlar: [],
    branches: [],
    users: [],
    ayarlar: {
        sirketAdi: 'Medisa',
        yetkiliKisi: '',
        telefon: '',
        eposta: ''
    },
    sifreler: [],
    arac_aylik_hareketler: [],
    duzeltme_talepleri: []
};

// Veri yükleme durumu
let isDataLoaded = false;
let isDataLoading = false;

/* =========================================
   LOCALSTORAGE'DAN VERİ YÜKLEME (Fallback)
   ========================================= */
function loadDataFromLocalStorage() {
    try {
        // Önce yeni formatı dene (medisa_data_v1)
        const savedData = localStorage.getItem('medisa_data_v1');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                window.appData = {
                    tasitlar: data.tasitlar || [],
                    kayitlar: data.kayitlar || [],
                    branches: data.branches || [],
                    users: data.users || [],
                    ayarlar: data.ayarlar || {
                        sirketAdi: 'Medisa',
                        yetkiliKisi: '',
                        telefon: '',
                        eposta: ''
                    },
                    sifreler: data.sifreler || [],
                    arac_aylik_hareketler: data.arac_aylik_hareketler || [],
                    duzeltme_talepleri: data.duzeltme_talepleri || []
                };
                isDataLoaded = true;
                return window.appData;
            } catch (e) {
                // Yeni format parse hatası, eski format deneniyor
            }
        }
        
        // Eski formatı dene (geriye dönük uyumluluk)
        const vehicles = JSON.parse(localStorage.getItem('medisa_vehicles_v1') || '[]');
        const branches = JSON.parse(localStorage.getItem('medisa_branches_v1') || '[]');
        const users = JSON.parse(localStorage.getItem('medisa_users_v1') || '[]');
        
        // window.appData'yı güncelle
        window.appData = {
            tasitlar: vehicles,
            kayitlar: [],
            branches: branches,
            users: users,
            ayarlar: {
                sirketAdi: 'Medisa',
                yetkiliKisi: '',
                telefon: '',
                eposta: ''
            },
            sifreler: [],
            arac_aylik_hareketler: [],
            duzeltme_talepleri: []
        };
        
        isDataLoaded = true;
        return window.appData;
    } catch (error) {
        isDataLoaded = true;
        return window.appData; // Varsayılan boş veri
    }
}

/* =========================================
   TAŞIT BİRLEŞTİRME (yerel + sunucu - olay/işaretleme kaybı önleme)
   ========================================= */
function mergeVehicleEvents(localEvents, serverEvents) {
    const local = Array.isArray(localEvents) ? localEvents : [];
    const server = Array.isArray(serverEvents) ? serverEvents : [];
    const byId = new Map();
    local.forEach(e => {
        if (e && (e.id || e.timestamp)) byId.set(e.id || e.timestamp, e);
    });
    server.forEach(e => {
        if (e && (e.id || e.timestamp)) {
            const key = e.id || e.timestamp;
            if (!byId.has(key)) byId.set(key, e);
        }
    });
    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
        const ta = (a.timestamp || a.date || '').toString();
        const tb = (b.timestamp || b.date || '').toString();
        return tb.localeCompare(ta);
    });
    return merged;
}

/* =========================================
   SUNUCUDAN VERİ YÜKLEME
   ========================================= */
async function loadDataFromServer(forceRefresh = true) {
    // Eğer zaten yükleniyorsa bekle (çift istek önleme)
    if (isDataLoading) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!isDataLoading) {
                    clearInterval(checkInterval);
                    resolve(window.appData);
                }
            }, 100);
        });
    }

    isDataLoading = true;
    
    try {
        // Cache-busting parametresi ekle (her seferinde güncel veri çekmek için)
        const cacheBuster = new Date().getTime();
        const url = `${API_LOAD}?t=${cacheBuster}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Yanıt okunamadı');
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 100)}`);
        }

        // Önce text olarak oku, JSON olup olmadığını kontrol et
        const responseText = await response.text();
        
        // Boş response kontrolü
        if (!responseText || responseText.trim() === '') {
            return loadDataFromLocalStorage();
        }
        
        // PHP kodu döndüyse (<?php ile başlıyorsa), localStorage'dan yükle
        const trimmedResponse = responseText.trim();
        if (trimmedResponse.startsWith('<?php') || (trimmedResponse.startsWith('<') && trimmedResponse.includes('html'))) {
            return loadDataFromLocalStorage();
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return loadDataFromLocalStorage();
        }

        // Yerel taşıtları oku ve sunucu taşıtları ile birleştir (olay/işaretleme kaybı önleme)
        let localTasitlar = [];
        try {
            const raw = localStorage.getItem('medisa_vehicles_v1');
            if (raw) localTasitlar = JSON.parse(raw);
            if (!Array.isArray(localTasitlar)) localTasitlar = [];
        } catch (e) {
            localTasitlar = [];
        }
        const serverTasitlar = data.tasitlar || [];
        const localMap = new Map(localTasitlar.map(lv => [String(lv.id), lv]));
        const mergedTasitlar = serverTasitlar.map(sv => {
            const local = localMap.get(String(sv.id));
            if (!local) return sv;
            const localEvents = local.events;
            const serverEvents = sv.events;
            const mergedEvents = mergeVehicleEvents(localEvents, serverEvents);
            const localBoyaliParcalar = local.boyaliParcalar && typeof local.boyaliParcalar === 'object' && Object.keys(local.boyaliParcalar).length > 0
                ? local.boyaliParcalar
                : null;
            const serverBoyaliParcalar = sv.boyaliParcalar && typeof sv.boyaliParcalar === 'object' && Object.keys(sv.boyaliParcalar).length > 0
                ? sv.boyaliParcalar
                : null;
            const localBoyaVar = local.boya === 'var';
            const localTahsisKisi = (local.tahsisKisi && String(local.tahsisKisi).trim()) || null;
            const localAssignedUserId = local.assignedUserId !== undefined && local.assignedUserId !== null && local.assignedUserId !== ''
                ? local.assignedUserId
                : null;
            return {
                ...sv,
                events: mergedEvents,
                boyaliParcalar: serverBoyaliParcalar || localBoyaliParcalar || {},
                boya: (serverBoyaliParcalar ? 'var' : (localBoyaVar ? 'var' : (sv.boya || local.boya))),
                tahsisKisi: localTahsisKisi || sv.tahsisKisi || local.tahsisKisi || '',
                assignedUserId: localAssignedUserId !== null ? localAssignedUserId : (sv.assignedUserId !== undefined ? sv.assignedUserId : local.assignedUserId)
            };
        });
        data.tasitlar = mergedTasitlar;

        // Global veri nesnesini güncelle (arac_aylik_hareketler, duzeltme_talepleri save sırasında silinmesin)
        window.appData = {
            tasitlar: data.tasitlar || [],
            kayitlar: data.kayitlar || [],
            branches: data.branches || [],
            users: data.users || [],
            ayarlar: data.ayarlar || {
                sirketAdi: 'Medisa',
                yetkiliKisi: '',
                telefon: '',
                eposta: ''
            },
            sifreler: data.sifreler || [],
            arac_aylik_hareketler: data.arac_aylik_hareketler || [],
            duzeltme_talepleri: data.duzeltme_talepleri || []
        };

        // Sunucudan başarıyla yüklendiğinde localStorage'ı da güncelle (taşıtlar/ayarlar/kayıt senkron)
        try {
            localStorage.setItem('medisa_data_v1', JSON.stringify(window.appData));
            if (window.appData.tasitlar) localStorage.setItem('medisa_vehicles_v1', JSON.stringify(window.appData.tasitlar));
            if (window.appData.branches) localStorage.setItem('medisa_branches_v1', JSON.stringify(window.appData.branches));
            if (window.appData.users) localStorage.setItem('medisa_users_v1', JSON.stringify(window.appData.users));
        } catch (e) {
            // localStorage güncellenemedi - sessizce devam et
        }

        isDataLoaded = true;
        return window.appData;

    } catch (error) {
        // Hata durumunda localStorage'dan yükle
        return loadDataFromLocalStorage();
    } finally {
        isDataLoading = false;
    }
}

/* =========================================
   SUNUCUYA VERİ KAYDETME
   ========================================= */
async function saveDataToServer() {
    try {
        const response = await fetch(API_SAVE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.appData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        return true;

    } catch (error) {
        // HTTP 405 hatası (Method Not Allowed) - Sunucu yapılandırması sorunu
        if (error.message && error.message.includes('405')) {
            return false; // Sessizce false dön
        }
        
        // PHP çalışmıyorsa sessizce devam et (localStorage zaten kaydedildi)
        const responseText = error.message || '';
        if (responseText.includes('<?php') || responseText.includes('Unexpected token')) {
            return false; // Sessizce false dön
        }
        // 404 veya ağ hatası - sessizce devam et (localStorage zaten güncel)
        if (error.message && (error.message.includes('404') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            console.warn('[Medisa] save.php erişilemedi, localStorage ile devam ediliyor.');
            return false;
        }
        // Diğer hatalar için konsola yaz (alert rahatsız edici)
        console.warn('[Medisa] Veri kaydedilemedi:', error.message);
        return false;
    }
}

/* =========================================
   YARDIMCI FONKSİYONLAR
   ========================================= */

// Taşıt ekleme/güncelleme
window.saveTasit = async function(tasit) {
    const existingIndex = window.appData.tasitlar.findIndex(t => t.id === tasit.id);
    
    if (existingIndex >= 0) {
        window.appData.tasitlar[existingIndex] = tasit;
    } else {
        window.appData.tasitlar.push(tasit);
    }
    
    return await saveDataToServer();
};

// Taşıt silme
window.deleteTasit = async function(tasitId) {
    window.appData.tasitlar = window.appData.tasitlar.filter(t => t.id !== tasitId);
    return await saveDataToServer();
};

// Kayıt ekleme/güncelleme
window.saveKayit = async function(kayit) {
    const existingIndex = window.appData.kayitlar.findIndex(k => k.id === kayit.id);
    
    if (existingIndex >= 0) {
        window.appData.kayitlar[existingIndex] = kayit;
    } else {
        window.appData.kayitlar.push(kayit);
    }
    
    return await saveDataToServer();
};

// Kayıt silme
window.deleteKayit = async function(kayitId) {
    window.appData.kayitlar = window.appData.kayitlar.filter(k => k.id !== kayitId);
    return await saveDataToServer();
};

// Ayarları kaydetme
window.saveAyarlar = async function(ayarlar) {
    window.appData.ayarlar = ayarlar;
    return await saveDataToServer();
};

// Şifre ekleme/güncelleme
window.saveSifre = async function(sifre) {
    const existingIndex = window.appData.sifreler.findIndex(s => s.id === sifre.id);
    
    if (existingIndex >= 0) {
        window.appData.sifreler[existingIndex] = sifre;
    } else {
        window.appData.sifreler.push(sifre);
    }
    
    return await saveDataToServer();
};

// Şifre silme
window.deleteSifre = async function(sifreId) {
    window.appData.sifreler = window.appData.sifreler.filter(s => s.id !== sifreId);
    return await saveDataToServer();
};

/* =========================================
   SAYFA YÜKLENME
   ========================================= */
document.addEventListener('DOMContentLoaded', async function() {
    isDataLoaded = false;
    isDataLoading = false;

    // Yedekten geri yükleme sonrası: sunucudan çekme, localStorage'daki yedek veriyi kullan
    if (sessionStorage.getItem('medisa_just_restored') === '1') {
        sessionStorage.removeItem('medisa_just_restored');
        const loadedData = loadDataFromLocalStorage();
        try {
            if (loadedData && loadedData.tasitlar) {
                localStorage.setItem('medisa_vehicles_v1', JSON.stringify(loadedData.tasitlar));
            }
            if (loadedData && loadedData.branches) {
                localStorage.setItem('medisa_branches_v1', JSON.stringify(loadedData.branches));
            }
            if (loadedData && loadedData.users) {
                localStorage.setItem('medisa_users_v1', JSON.stringify(loadedData.users));
            }
        } catch (e) { }
        window.dispatchEvent(new CustomEvent('dataLoaded', { detail: window.appData }));
        return;
    }

    // Normal açılış: sunucudan güncel veriyi çek
    const loadedData = await loadDataFromServer(true);

    try {
        if (loadedData && loadedData.tasitlar) {
            localStorage.setItem('medisa_vehicles_v1', JSON.stringify(loadedData.tasitlar));
        }
        if (loadedData && loadedData.branches) {
            localStorage.setItem('medisa_branches_v1', JSON.stringify(loadedData.branches));
        }
        if (loadedData && loadedData.users) {
            localStorage.setItem('medisa_users_v1', JSON.stringify(loadedData.users));
        }
    } catch (e) {
        // Eski localStorage key'leri güncellenemedi - sessizce devam et
    }

    window.dispatchEvent(new CustomEvent('dataLoaded', { 
        detail: window.appData 
    }));
});

// Export fonksiyonları
window.loadDataFromServer = loadDataFromServer;
window.saveDataToServer = saveDataToServer;
