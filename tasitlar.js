/* =========================================
   TAŞITLAR MODÜLÜ - Liste, Detay, Olay Ekleme
   KM validasyonu: Son bildirilen KM'den düşük girişte uyarı
   ========================================= */

(function() {
    function getVehicles() {
        if (window.appData && Array.isArray(window.appData.tasitlar)) {
            return window.appData.tasitlar;
        }
        try {
            return JSON.parse(localStorage.getItem('medisa_vehicles_v1') || '[]');
        } catch { return []; }
    }

    function getBranches() {
        if (window.appData && Array.isArray(window.appData.branches)) {
            return window.appData.branches;
        }
        try {
            return JSON.parse(localStorage.getItem('medisa_branches_v1') || '[]');
        } catch { return []; }
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatKm(val) {
        if (val == null || val === '') return '-';
        const s = String(val).replace(/[^\d]/g, '');
        if (!s) return '-';
        return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function parseKmInput(val) {
        if (!val || typeof val !== 'string') return null;
        const num = parseInt(val.replace(/[^\d]/g, ''), 10);
        return isNaN(num) ? null : num;
    }

    function getLastReportedKm(vehicle) {
        const guncel = vehicle.guncelKm;
        if (guncel != null && guncel !== '') {
            const n = parseInt(String(guncel).replace(/[^\d]/g, ''), 10);
            if (!isNaN(n)) return n;
        }
        const km = vehicle.km;
        if (km != null && km !== '') {
            const n = parseInt(String(km).replace(/[^\d]/g, ''), 10);
            if (!isNaN(n)) return n;
        }
        const events = vehicle.events || [];
        for (let i = 0; i < events.length; i++) {
            const d = events[i].data;
            if (d && d.yeniKm != null) {
                const n = parseInt(String(d.yeniKm).replace(/[^\d]/g, ''), 10);
                if (!isNaN(n)) return n;
            }
        }
        return null;
    }

    // --- Taşıt listesi render ---
    function renderVehiclesList() {
        const container = document.getElementById('vehicles-modal-content');
        if (!container) return;

        const vehicles = getVehicles();
        const branches = getBranches();

        const branchNames = {};
        branches.forEach(b => { branchNames[b.id] = b.name || '-'; });

        const header = `
            <div class="list-header-row">
                <div class="list-cell list-year"><span>Yıl</span></div>
                <div class="list-cell list-plate"><span>Plaka</span></div>
                <div class="list-cell list-brand"><span>Marka/Model</span></div>
                <div class="list-cell list-km"><span>KM</span></div>
                <div class="list-cell list-type"><span>Tip</span></div>
                <div class="list-cell list-branch"><span>Şube</span></div>
            </div>
        `;

        const rows = vehicles
            .filter(v => !v.satildiMi)
            .map((v, i) => {
                const kmDisplay = formatKm(v.guncelKm || v.km);
                const tip = v.vehicleType === 'otomobil' ? 'Otomobil' : v.vehicleType === 'minivan' ? 'Küçük Ticari' : v.vehicleType === 'kamyon' ? 'Büyük Ticari' : '-';
                const branch = v.branchId ? (branchNames[v.branchId] || '-') : '-';
                return `
                    <div class="list-item" onclick="showVehicleDetail('${escapeHtml(v.id)}')">
                        <div class="list-cell list-year">${escapeHtml(v.year || '-')}</div>
                        <div class="list-cell list-plate">${escapeHtml(v.plate || '-')}</div>
                        <div class="list-cell list-brand">${escapeHtml(v.brandModel || '-')}</div>
                        <div class="list-cell list-km">${escapeHtml(kmDisplay)}</div>
                        <div class="list-cell list-type">${escapeHtml(tip)}</div>
                        <div class="list-cell list-branch">${escapeHtml(branch)}</div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = `<div class="view-list">${header}${rows}</div>`;
    }

    // --- openVehiclesView override: render + aç ---
    const _openVehiclesView = window.openVehiclesView;
    window.openVehiclesView = function() {
        renderVehiclesList();
        if (_openVehiclesView) _openVehiclesView();
    };

    // --- Taşıt detay ---
    window.showVehicleDetail = function(vehicleId) {
        window.currentDetailVehicleId = vehicleId;
        const vehicles = getVehicles();
        const branches = getBranches();
        const v = vehicles.find(v => v.id === vehicleId);
        if (!v) return;

        const container = document.getElementById('vehicle-detail-content');
        if (!container) return;

        const branch = v.branchId ? branches.find(b => b.id === v.branchId) : null;
        const branchName = branch ? branch.name : '-';
        const kmDisplay = formatKm(v.guncelKm || v.km);

        const left = `
            <div class="detail-plate-row">
                <div class="detail-plate">${escapeHtml(v.plate || '-')}</div>
            </div>
            <div class="detail-brand-year-row">
                <button class="history-add-event-btn" onclick="openEventModal('menu', '${escapeHtml(v.id)}')" title="Olay Ekle">+ Olay Ekle</button>
                <div class="detail-brand-year">${escapeHtml(v.brandModel || '-')} (${escapeHtml(v.year || '-')})</div>
                <button class="history-btn-minimal" onclick="openVehicleHistoryModal('${escapeHtml(v.id)}')">Tarihçe</button>
            </div>
            <div class="vehicle-detail-columns">
                <div class="vehicle-detail-left">
                    <div class="detail-row"><span class="detail-row-label">Güncel KM:</span><span class="detail-row-value">${escapeHtml(kmDisplay)}</span></div>
                    <div class="detail-row"><span class="detail-row-label">Şube:</span><span class="detail-row-value">${escapeHtml(branchName)}</span></div>
                    <div class="detail-row"><span class="detail-row-label">Şanzıman:</span><span class="detail-row-value">${v.transmission === 'manuel' ? 'Manuel' : v.transmission === 'otomatik' ? 'Otomatik' : '-'}</span></div>
                </div>
                <div class="vehicle-detail-right">
                    <div class="detail-row"><span class="detail-row-label">Sigorta:</span><span class="detail-row-value">${v.sigortaDate ? escapeHtml(v.sigortaDate) : '-'}</span></div>
                    <div class="detail-row"><span class="detail-row-label">Kasko:</span><span class="detail-row-value">${v.kaskoDate ? escapeHtml(v.kaskoDate) : '-'}</span></div>
                    <div class="detail-row"><span class="detail-row-label">Muayene:</span><span class="detail-row-value">${v.muayeneDate ? escapeHtml(v.muayeneDate) : '-'}</span></div>
                </div>
            </div>
        `;

        container.innerHTML = left;

        // Detay modalı aç
        const detailModal = document.getElementById('vehicle-detail-modal');
        if (detailModal) {
            detailModal.style.display = 'flex';
            requestAnimationFrame(() => detailModal.classList.add('active'));
            const vehiclesModal = document.getElementById('vehicles-modal');
            if (vehiclesModal) {
                vehiclesModal.classList.remove('active');
                vehiclesModal.style.display = 'none';
            }
            detailModal.classList.add('active');
            if (window.updateFooterDim) window.updateFooterDim();
        }
    };

    // --- Olay menüsü ---
    const EVENT_ITEMS = [
        { id: 'bakim', label: 'Bakım Bilgisi Ekle' },
        { id: 'kaza', label: 'Kaza Bilgisi Ekle' },
        { id: 'sigorta', label: 'Sigorta Bilgisi Güncelle' },
        { id: 'kasko', label: 'Kasko Bilgisi Güncelle' },
        { id: 'muayene', label: 'Muayene Bilgisi Güncelle' },
        { id: 'anahtar', label: 'Yedek Anahtar Bilgisi Güncelle' },
        { id: 'kredi', label: 'Kredi/Rehin Bilgisi Güncelle' },
        { id: 'km', label: 'Km Güncelle' },
        { id: 'lastik', label: 'Yazlık/Kışlık Lastik Durumu Güncelle' },
        { id: 'utts', label: 'UTTS Bilgisi Güncelle' },
        { id: 'takip', label: 'Takip Cihazı Bilgisi Güncelle' },
        { id: 'sube', label: 'Şube Değişikliği' },
        { id: 'kullanici', label: 'Kullanıcı Atama' },
        { id: 'satis', label: 'Satış / Pert' }
    ];

    const MODAL_IDS = {
        bakim: 'bakim-ekle-modal',
        kaza: 'kaza-ekle-modal',
        sigorta: 'sigorta-guncelle-modal',
        kasko: 'kasko-guncelle-modal',
        muayene: 'muayene-guncelle-modal',
        anahtar: 'anahtar-guncelle-modal',
        kredi: 'kredi-guncelle-modal',
        km: 'km-guncelle-modal',
        lastik: 'lastik-guncelle-modal',
        utts: 'utts-guncelle-modal',
        takip: 'takip-cihaz-guncelle-modal',
        sube: 'sube-degisiklik-modal',
        kullanici: 'kullanici-atama-modal',
        satis: 'satis-pert-modal'
    };

    window.openEventModal = function(type, vehicleId) {
        window.currentDetailVehicleId = vehicleId;
        if (type === 'menu') {
            const list = document.getElementById('event-menu-list');
            const menuModal = document.getElementById('event-menu-modal');
            if (!list || !menuModal) return;
            list.innerHTML = EVENT_ITEMS.map(e => {
                const safeId = String(vehicleId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `<button type="button" onclick="openEventModal('${e.id}', '${safeId}')">${escapeHtml(e.label)}</button>`;
            }).join('');
            menuModal.style.display = 'flex';
            menuModal.classList.add('active');
        } else {
            const modalId = MODAL_IDS[type];
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    document.getElementById('event-menu-modal').style.display = 'none';
                    document.getElementById('event-menu-modal').classList.remove('active');
                    modal.style.display = 'flex';
                    modal.classList.add('active');
                    if (type === 'km') {
                        const input = document.getElementById('km-guncelle-input');
                        if (input) {
                            const v = getVehicles().find(x => x.id === vehicleId);
                            input.value = v ? formatKm(v.guncelKm || v.km) : '';
                            input.placeholder = '150.000';
                        }
                    }
                }
            }
        }
        if (window.updateFooterDim) window.updateFooterDim();
    };

    window.closeEventModal = function(type) {
        const modalId = type ? MODAL_IDS[type] : null;
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        }
        if (window.updateFooterDim) window.updateFooterDim();
    };

    window.closeAllModals = function() {
        document.querySelectorAll('.tasitlar-modal-overlay olay-ekle-modal, .tasitlar-modal-overlay.olay-ekle-modal').forEach(m => {
            m.style.display = 'none';
            m.classList.remove('active');
        });
        const menu = document.getElementById('event-menu-modal');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('active');
        }
        if (window.updateFooterDim) window.updateFooterDim();
    };

    // --- KM Güncelle (son bildirilen KM'den düşükse uyarı) ---
    window.updateKmInfo = async function() {
        const vehicleId = window.currentDetailVehicleId;
        const input = document.getElementById('km-guncelle-input');
        if (!vehicleId || !input) return;

        const newKmStr = (input.value || '').trim();
        const newKm = parseKmInput(newKmStr);
        if (newKm === null) {
            alert('Lütfen geçerli bir KM değeri girin.');
            input.focus();
            return;
        }

        const vehicles = getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        const lastKm = getLastReportedKm(vehicle);
        if (lastKm !== null && newKm < lastKm) {
            const msg = `⚠️ Uyarı: Girilen KM (${formatKm(newKm)}) son bildirilen KM'den (${formatKm(lastKm)}) düşüktür. Yine de kaydetmek istiyor musunuz?`;
            if (!confirm(msg)) return;
        }

        const eskiKm = (vehicle.guncelKm != null ? String(vehicle.guncelKm).replace(/[^\d]/g, '') : vehicle.km ? String(vehicle.km).replace(/[^\d]/g, '') : '') || '-';

        vehicle.guncelKm = String(newKm);
        if (!vehicle.events) vehicle.events = [];
        vehicle.events.unshift({
            id: Date.now().toString() + 'km',
            type: 'km-revize',
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            data: { eskiKm, yeniKm: String(newKm) }
        });

        if (window.appData) {
            const idx = window.appData.tasitlar.findIndex(t => t.id === vehicleId);
            if (idx >= 0) window.appData.tasitlar[idx] = vehicle;
        }
        try {
            const toSave = window.appData ? window.appData.tasitlar : vehicles;
            localStorage.setItem('medisa_vehicles_v1', JSON.stringify(toSave));
        } catch (e) {}

        if (window.saveDataToServer) {
            try { await window.saveDataToServer(); } catch (err) { console.warn('Sunucu kaydedilemedi:', err); }
        }

        closeEventModal('km');
        if (window.currentDetailVehicleId) showVehicleDetail(window.currentDetailVehicleId);
        alert('KM bilgisi güncellendi.');
    };

    // --- Bakım / Kaza (stub - temel kayıt) ---
    window.saveBakimEvent = async function() {
        const vehicleId = window.currentDetailVehicleId;
        if (!vehicleId) return;
        const vehicles = getVehicles();
        const v = vehicles.find(x => x.id === vehicleId);
        if (!v) return;

        const tarih = document.getElementById('bakim-tarih')?.value || '';
        const islemler = document.getElementById('bakim-islemler')?.value?.trim() || '';
        const servis = document.getElementById('bakim-servis')?.value?.trim() || '';
        const kisi = document.getElementById('bakim-kisi')?.value?.trim() || '';
        const km = document.getElementById('bakim-km')?.value?.trim() || '';
        const tutar = document.getElementById('bakim-tutar')?.value?.trim() || '';

        if (!tarih || !islemler) {
            alert('Tarih ve yapılan işlemler zorunludur.');
            return;
        }

        if (!v.events) v.events = [];
        v.events.unshift({
            id: Date.now().toString() + 'b',
            type: 'bakim',
            date: tarih,
            timestamp: new Date().toISOString(),
            data: { islemler, servis, kisi, km, tutar }
        });

        if (window.appData) {
            const idx = window.appData.tasitlar.findIndex(t => t.id === vehicleId);
            if (idx >= 0) window.appData.tasitlar[idx] = v;
        }
        try { localStorage.setItem('medisa_vehicles_v1', JSON.stringify(getVehicles())); } catch (e) {}
        if (window.saveDataToServer) try { await window.saveDataToServer(); } catch (err) {}
        closeEventModal('bakim');
        if (window.currentDetailVehicleId) showVehicleDetail(window.currentDetailVehicleId);
        alert('Bakım bilgisi eklendi.');
    };

    window.saveKazaEvent = async function() {
        const vehicleId = window.currentDetailVehicleId;
        if (!vehicleId) return;
        const vehicles = getVehicles();
        const v = vehicles.find(x => x.id === vehicleId);
        if (!v) return;

        const tarih = document.getElementById('kaza-tarih')?.value || '';
        const aciklama = document.getElementById('kaza-aciklama')?.value?.trim() || '';
        const surucu = document.getElementById('kaza-surucu')?.value?.trim() || '';
        const tutar = document.getElementById('kaza-tutar')?.value?.trim() || '';

        if (!tarih) {
            alert('Tarih zorunludur.');
            return;
        }

        if (!v.events) v.events = [];
        v.events.unshift({
            id: Date.now().toString() + 'k',
            type: 'kaza',
            date: tarih,
            timestamp: new Date().toISOString(),
            data: { aciklama, surucu, hasarTutari: tutar }
        });

        if (window.appData) {
            const idx = window.appData.tasitlar.findIndex(t => t.id === vehicleId);
            if (idx >= 0) window.appData.tasitlar[idx] = v;
        }
        try { localStorage.setItem('medisa_vehicles_v1', JSON.stringify(getVehicles())); } catch (e) {}
        if (window.saveDataToServer) try { await window.saveDataToServer(); } catch (err) {}
        closeEventModal('kaza');
        if (window.currentDetailVehicleId) showVehicleDetail(window.currentDetailVehicleId);
        alert('Kaza bilgisi eklendi.');
    };

    // --- Tarihçe modal ---
    window.openVehicleHistoryModal = function(vehicleId) {
        window.currentDetailVehicleId = vehicleId;
        const modal = document.getElementById('vehicle-history-modal');
        if (modal) {
            document.getElementById('vehicle-detail-modal').style.display = 'none';
            document.getElementById('vehicle-detail-modal').classList.remove('active');
            modal.style.display = 'flex';
            modal.classList.add('active');
            switchHistoryTab('bakim');
        }
        if (window.updateFooterDim) window.updateFooterDim();
    };

    window.closeVehicleHistoryModal = function() {
        const modal = document.getElementById('vehicle-history-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        if (window.updateFooterDim) window.updateFooterDim();
    };

    window.switchHistoryTab = function(tab) {
        document.querySelectorAll('#history-tabs .history-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        const content = document.getElementById('history-content');
        if (!content) return;

        const vehicleId = window.currentDetailVehicleId;
        const vehicles = getVehicles();
        const v = vehicles.find(x => x.id === vehicleId);
        if (!v) return;

        const events = (v.events || []).filter(e => {
            if (tab === 'bakim') return e.type === 'bakim';
            if (tab === 'kaza') return e.type === 'kaza';
            if (tab === 'km') return e.type === 'km-revize';
            if (tab === 'sube') return e.type === 'sube-degisiklik' || e.type === 'kullanici-atama';
            return false;
        });

        content.innerHTML = events.length === 0
            ? '<div style="padding:20px;color:#888;text-align:center;">Kayıt bulunamadı.</div>'
            : events.map(e => {
                const d = e.data || {};
                let text = '';
                if (e.type === 'bakim') text = `İşlemler: ${d.islemler || '-'} | Servis: ${d.servis || '-'}`;
                else if (e.type === 'kaza') text = `Açıklama: ${d.aciklama || '-'} | Sürücü: ${d.surucu || '-'}`;
                else if (e.type === 'km-revize') text = `${d.eskiKm || '-'} → ${d.yeniKm || '-'} km`;
                else text = JSON.stringify(d);
                return `<div class="history-item" style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);"><div style="font-size:11px;color:#888;">${escapeHtml(e.date || '')}</div><div style="font-size:13px;color:#ccc;">${escapeHtml(text)}</div></div>`;
            }).join('');
    };

})();
