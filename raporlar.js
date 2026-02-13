/* =========================================
   RAPORLAR MODÜLÜ - SEKME YAPILI
   ========================================= */

(function() {
    // --- Veri Okuma Yardımcıları ---
    function getVehicles() {
        try { 
            return JSON.parse(localStorage.getItem("medisa_vehicles_v1")) || []; 
        } catch { 
            return []; 
        }
    }
    
    function getBranches() {
        try { 
            return JSON.parse(localStorage.getItem("medisa_branches_v1")) || []; 
        } catch { 
            return []; 
        }
    }
    
    function getUsers() {
        try { 
            return JSON.parse(localStorage.getItem("medisa_users_v1")) || []; 
        } catch { 
            return []; 
        }
    }

    // --- STOK Görünümü State ---
    let stokCurrentBranchId = null; // null = grid görünümü, 'all' = tümü listesi, 'id' = şube listesi
    let stokSortState = {}; // { columnKey: 'asc' | 'desc' | null }
    
    // --- KULLANICI Görünümü State ---
    let kullaniciCurrentBranchId = null; // null = grid görünümü, 'all' = tümü listesi, 'id' = şube listesi
    let kullaniciSearchTerm = ''; // Arama terimi
    let kullaniciCurrentUserId = null; // Seçili kullanıcı ID'si (detay görünümü için)
    let stokActiveColumns = {
        sigorta: false,
        kasko: false,
        muayene: false,
        kredi: false,
        lastik: false,
        utts: false,
        takip: false,
        tramer: false,
        boya: false,
        kullanici: false,
        tescil: false
    };
    let stokColumnOrder = []; // Aktif detay sütunların sırası
    let stokBaseColumnOrder = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km']; // Temel sütunların sırası
    let stokDetailMenuOpen = false; // Detay Ekleme menüsü açık mı (toggle için tek kaynak)

    // localStorage'dan aktif sütunları yükle
    function loadStokColumnState() {
        try {
            const saved = localStorage.getItem('stok_active_columns');
            if (saved) {
                stokActiveColumns = { ...stokActiveColumns, ...JSON.parse(saved) };
            }
            const savedOrder = localStorage.getItem('stok_column_order');
            if (savedOrder) {
                stokColumnOrder = JSON.parse(savedOrder);
            }
            const savedBaseOrder = localStorage.getItem('stok_base_column_order');
            if (savedBaseOrder) {
                const loadedOrder = JSON.parse(savedBaseOrder);
                // Plaka sütunu mutlaka olmalı - yoksa varsayılan değere geri dön
                if (!loadedOrder.includes('plaka')) {
                    stokBaseColumnOrder = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km'];
                    saveStokColumnState(); // Düzeltilmiş sıralamayı kaydet
                } else {
                    stokBaseColumnOrder = loadedOrder;
                }
            }
        } catch (e) {
            // Hata durumunda varsayılan değerler kullanılacak
            stokBaseColumnOrder = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km'];
        }
    }

    // Aktif sütunları localStorage'a kaydet
    function saveStokColumnState() {
        try {
            localStorage.setItem('stok_active_columns', JSON.stringify(stokActiveColumns));
            localStorage.setItem('stok_column_order', JSON.stringify(stokColumnOrder));
            localStorage.setItem('stok_base_column_order', JSON.stringify(stokBaseColumnOrder));
        } catch (e) {
            // Hata durumunda sessizce devam et
        }
    }

    // --- Modal ve Sekme Yönetimi ---
    window.openReportsView = function() {
        const modal = document.getElementById('reports-modal');
        if (modal) {
            loadStokColumnState(); // Aktif sütunları yükle
            stokCurrentBranchId = null; // Grid görünümüne dön
            renderStokView(); // Rapor görünümünü render et
            modal.style.display = 'flex';
            requestAnimationFrame(() => modal.classList.add('active'));
            document.body.classList.add('modal-open');
        }
    };

    window.closeReportsModal = function() {
        const modal = document.getElementById('reports-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }, 300);
        }
    };


    // --- 1. SEKME: STOK GÖRÜNÜMÜ ---
    
    // Sütun başlık metinleri (responsive)
    function getColumnHeaderText(colKey) {
        const isMobile = window.innerWidth <= 640;
        const isVerySmall = window.innerWidth <= 480;
        const isTiny = window.innerWidth <= 360;
        
        const headers = {
            'sira': 'No.',
            'sube': 'Şube',
            'yil': 'Yıl',
            'marka': isTiny ? 'Mrk' : isVerySmall ? 'Marka' : 'Marka/Model',
            'plaka': 'Plaka',
            'sanziman': isTiny ? 'Ş.' : isVerySmall ? 'Şanz.' : 'Şanzıman',
            'km': 'KM',
            'sigorta': isVerySmall ? 'Sig.' : isMobile ? 'Sigorta' : 'Sigorta Bitiş',
            'kasko': isVerySmall ? 'Kas.' : isMobile ? 'Kasko' : 'Kasko Bitiş',
            'muayene': isVerySmall ? 'Muay.' : isMobile ? 'Muayene' : 'Muayene T.',
            'kredi': isTiny ? 'K/R' : isVerySmall ? 'Kredi' : isMobile ? 'Kredi/Rehin' : 'Kredi/Rehin',
            'lastik': isTiny ? 'Y/K' : isVerySmall ? 'Yaz/Kış' : isMobile ? 'Yazlık/Kışlık' : 'Lastikler',
            'utts': 'UTTS',
            'takip': isVerySmall ? 'Tkp' : isMobile ? 'Takip' : 'Takip Cihazı',
            'tramer': 'Tramer',
            'boya': isVerySmall ? 'Boy.' : isMobile ? 'Boya' : 'Boya Değişen',
            'kullanici': isVerySmall ? 'Kull.' : isMobile ? 'Kullanıcı' : 'Kullanıcı',
            'tescil': isVerySmall ? 'Tescil' : isMobile ? 'Tescil T.' : 'Tescil Tarihi'
        };
        
        return headers[colKey] || colKey;
    }

    // Şube Grid Render
    function renderStokBranchGrid() {
        const gridContainer = document.getElementById('stok-branch-grid');
        const listContainer = document.getElementById('stok-list-container');
        const headerActions = document.getElementById('reports-list-header-actions');
        if (headerActions) {
            headerActions.innerHTML = '';
            headerActions.setAttribute('aria-hidden', 'true');
        }
        if (!gridContainer) return;
        
        const branches = getBranches();
        const vehicles = getVehicles();
        
        // Grid görünümünü göster, liste görünümünü gizle
        if (gridContainer) gridContainer.style.display = 'flex';
        if (listContainer) {
            listContainer.style.display = 'none';
            listContainer.innerHTML = '';
        }
        
        // "Tümü" kartı
        const totalCount = vehicles.length;
        let html = `
            <div class="stok-branch-card all-card ${stokCurrentBranchId === 'all' ? 'active' : ''}" 
                 onclick="selectStokBranch('all')">
                <div class="stok-branch-name">Tümü</div>
                <div class="stok-branch-count">${totalCount} Taşıt</div>
            </div>
        `;
        
        // Şube kartları
        branches.forEach(branch => {
            const branchVehicles = vehicles.filter(v => v.branchId === branch.id);
            const count = branchVehicles.length;
            const isActive = stokCurrentBranchId === branch.id;
            
            html += `
                <div class="stok-branch-card ${isActive ? 'active' : ''}" 
                     onclick="selectStokBranch('${escapeHtml(branch.id)}')">
                    <div class="stok-branch-name">${escapeHtml(branch.name)}</div>
                    <div class="stok-branch-count">${count} Taşıt</div>
                </div>
            `;
        });
        
        gridContainer.innerHTML = html;
    }

    // Şube Seçimi
    window.selectStokBranch = function(branchId) {
        stokCurrentBranchId = branchId;
        renderStokView();
    };

    // Liste Görünümü Render
    function renderStokList() {
        const gridContainer = document.getElementById('stok-branch-grid');
        const listContainer = document.getElementById('stok-list-container');
        
        if (!listContainer) return;
        
        // Detay menü açık/kapalı tek kaynak: stokDetailMenuOpen (liste yeniden render'da korunur)
        
        // Grid görünümünü gizle, liste görünümünü göster
        if (gridContainer) gridContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
        
        let vehicles = getVehicles();
        const branches = getBranches();
        
        // Filtreleme
        if (stokCurrentBranchId === 'all') {
            // Tüm taşıtlar
        } else if (stokCurrentBranchId) {
            vehicles = vehicles.filter(v => v.branchId === stokCurrentBranchId);
            } else {
            // Grid görünümünde, liste render edilmemeli
            return;
        }
        
        // Arama filtresi
        const searchTerm = window.stokSearchTerm || '';
        if (searchTerm) {
            vehicles = vehicles.filter(v => {
                const year = String(v.year || '').toLowerCase();
                const brandModel = (v.brandModel || '').toLowerCase();
                const user = getVehicleUser(v).toLowerCase();
                const branch = v.branchId ? (branches.find(b => b.id === v.branchId)?.name || '').toLowerCase() : '';
                
                return year.includes(searchTerm) || 
                       brandModel.includes(searchTerm) || 
                       user.includes(searchTerm) || 
                       branch.includes(searchTerm);
            });
        }
        
        // Sıralama uygula
        vehicles = applyStokSorting(vehicles);
        
        // Sütun başlıklarını oluştur
        const headerRow = createStokHeaderRow();
        const rows = vehicles.map((v, index) => createStokDataRow(v, index + 1, branches));
        
        // Bugünün tarihini formatla (gg/aa/yyyy)
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        const todayInputValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        listContainer.innerHTML = `
            <div class="stok-list-top-controls">
                <div class="stok-controls-row-1">
                    <button class="stok-back-btn" onclick="goBackToStokGrid()" title="Geri Dön">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <button class="stok-detail-add-btn ${stokDetailMenuOpen ? 'active' : ''}" onclick="toggleStokDetailMenu()">+ Detay Ekleme</button>
                </div>
                <div class="stok-controls-row-2">
                    <div class="stok-export-controls">
                        <div class="stok-export-left">
                            <button class="stok-export-btn" onclick="exportStokToExcel()" title="Excel'e Aktar">
                                <span class="excel-icon">X</span>
                            </button>
                            <button class="stok-print-btn" onclick="printStokReport()" title="Yazdır">
                                🖨️
                            </button>
                            <div class="stok-search-wrap">
                                <button class="stok-search-btn" onclick="toggleStokSearch()" title="Ara">
                                    🔍
                                </button>
                                <div id="stok-search-container" class="stok-search-container">
                                    <input type="text" id="stok-search-input" class="stok-search-input" placeholder="Üretim yılı, marka/model, kullanıcı, şube ara..." oninput="handleStokSearch(this.value)">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="stok-detail-menu" class="stok-detail-menu ${stokDetailMenuOpen ? 'stok-detail-menu-open' : ''}"></div>
                    <div class="stok-date-range-controls">
                        <div class="stok-date-input-group">
                            <label for="stok-date-start">Başlangıç T.</label>
                            <input type="date" id="stok-date-start" class="stok-date-input" placeholder="">
                        </div>
                        <div class="stok-date-input-group">
                            <label for="stok-date-end">Bitiş T.</label>
                            <input type="date" id="stok-date-end" class="stok-date-input stok-date-has-value" value="${todayInputValue}">
                        </div>
                    </div>
                </div>
            </div>
            <div class="stok-list-container">
                <table class="stok-list-table">
                    <thead class="stok-list-header">
                        ${headerRow}
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Mobilde sol ok ve Detay Ekleme satırını header altındaki slota klonla
        const headerActions = document.getElementById('reports-list-header-actions');
        if (headerActions) {
            const firstRow = listContainer.querySelector('.stok-controls-row-1');
            if (firstRow) {
                headerActions.innerHTML = '';
                headerActions.appendChild(firstRow.cloneNode(true));
                headerActions.setAttribute('aria-hidden', 'false');
            }
        }

        // Detay menüsünü render et
        renderStokDetailMenu();
        
        // Tarih inputlarına placeholder ekle
        setTimeout(() => {
            const startInput = document.getElementById('stok-date-start');
            const endInput = document.getElementById('stok-date-end');
            
            // Başlangıç tarihi için bitiş tarihi gibi normal yap (overlay placeholder kullanma)
            if (startInput) {
                // Mevcut overlay placeholder'ı temizle
                const existingPlaceholder = startInput.parentElement.querySelector('.date-placeholder');
                if (existingPlaceholder) {
                    existingPlaceholder.remove();
                }
                
                // Eski style'ı temizle
                const oldStyle = document.getElementById('stok-date-start-style');
                if (oldStyle) {
                    oldStyle.remove();
                }
                
                // Input'u bitiş tarihi gibi normal yap - her zaman görünür
                startInput.style.color = '#ccc';
                startInput.style.setProperty('color', '#ccc', 'important');
                startInput.style.setProperty('-webkit-text-fill-color', '#ccc', 'important');
                
                // Webkit datetime-edit stillerini normal yap
                const style = document.createElement('style');
                style.id = 'stok-date-start-style';
                style.textContent = `
                    #stok-date-start::-webkit-datetime-edit { color: #ccc !important; -webkit-text-fill-color: #ccc !important; }
                    #stok-date-start::-webkit-datetime-edit-fields-wrapper { color: #ccc !important; -webkit-text-fill-color: #ccc !important; }
                    #stok-date-start::-webkit-datetime-edit-text { color: #ccc !important; -webkit-text-fill-color: #ccc !important; }
                    #stok-date-start::-webkit-datetime-edit-month-field,
                    #stok-date-start::-webkit-datetime-edit-day-field,
                    #stok-date-start::-webkit-datetime-edit-year-field { color: #ccc !important; -webkit-text-fill-color: #ccc !important; }
                `;
                document.head.appendChild(style);
            }
            
            // Bitiş tarihi için value zaten var, placeholder ekleme
            // setupDatePlaceholder HİÇ çağrılmasın çünkü rengi transparent yapıyor
            if (endInput) {
                // Value'nun doğru set edildiğinden emin ol
                const today = new Date();
                const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                endInput.value = todayValue;
                
                // Input'un rengini zorla beyaz yap
                endInput.style.setProperty('color', '#fff', 'important');
                endInput.style.color = '#fff';
                
                // Eğer bir şekilde placeholder oluşturulmuşsa kaldır
                const existingPlaceholder = endInput.parentElement.querySelector('.date-placeholder');
                if (existingPlaceholder) {
                    existingPlaceholder.remove();
                }
                
                // Input'un rengini koru - herhangi bir değişiklikte tekrar set et
                const keepColorWhite = () => {
                    if (endInput.value) {
                        endInput.style.setProperty('color', '#fff', 'important');
                    }
                };
                
                // Input değiştiğinde rengi koru
                endInput.addEventListener('change', keepColorWhite);
                endInput.addEventListener('input', keepColorWhite);
                endInput.addEventListener('focus', keepColorWhite);
                endInput.addEventListener('blur', keepColorWhite);
                
                // İlk yüklemede de rengi set et
                keepColorWhite();
            }
        }, 50);
        
        // Sıralama event listener'larını ekle
        attachStokSortListeners();
        // Mobil: liste tek hamlede ya yatay ya dikey kaysın (eksen kilidi)
        setupStokListTouchAxisLock();
        // Marka hücreleri: sütun daraldıkça font küçülsün (Taşıtlar gibi)
        adjustStokMarkaFontSizes();
    }

    // Marka hücreleri: taşma durumunda font küçült (Taşıtlar formatı)
    function adjustStokMarkaFontSizes() {
        const listContainer = document.getElementById('stok-list-container');
        if (!listContainer) return;
        const brandCells = listContainer.querySelectorAll('.stok-list-cell[data-col="marka"]');
        const minFontSize = 9;
        const baseFontSize = 12;
        brandCells.forEach(cell => {
            if (cell.offsetHeight === 0) return; /* Gizli container'da çalışmasın */
            cell.style.fontSize = baseFontSize + 'px';
            while (cell.scrollHeight > cell.offsetHeight && parseInt(cell.style.fontSize) > minFontSize) {
                const current = parseInt(cell.style.fontSize) || baseFontSize;
                cell.style.fontSize = (current - 1) + 'px';
            }
        });
        // Resize'da tekrar hesapla
        if (!window._stokMarkaResize) {
            window._stokMarkaResize = true;
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const container = document.getElementById('stok-list-container');
                    if (container && container.querySelector('.stok-list-cell[data-col="marka"]')) {
                        adjustStokMarkaFontSizes();
                    }
                }, 100);
            });
        }
    }

    // Sütun genişliklerini hesapla (Taşıtlar modalı ile uyumlu: daha az px, daha çok fr)
    function getColumnWidths(allColumns) {
        const columnWidths = {
            // Temel sütunlar - Taşıtlar formatı: 40px 70px 3.5fr 60px 65px 2fr (toplam: 235px + 5.5fr)
            'sira': '35px',         // Sadece numara, dar
            'sube': '1.5fr',        // Esnek, şube adları
            'yil': '50px',          // Yıl: 4 rakam
            'marka': '3fr',         // En geniş, marka/model
            'plaka': '80px',        // Plaka numaraları
            'sanziman': '1fr',      // Esnek: Manuel/Otomatik
            'km': '70px',           // KM değerleri
            // Detay sütunları - daha dar, bazıları esnek
            'sigorta': '0.8fr',
            'kasko': '0.8fr',
            'muayene': '0.8fr',
            'kredi': '60px',
            'lastik': '60px',
            'utts': '55px',
            'takip': '60px',
            'tramer': '60px',
            'boya': '60px',
            'kullanici': '0.9fr',
            'tescil': '0.8fr'
        };

        return allColumns.map(col => columnWidths[col.key] || '70px').join(' ');
    }

    // Sütun başlık satırı oluştur
    function createStokHeaderRow() {
        const baseColumns = [
            { key: 'sira', sortable: false },
            { key: 'sube', sortable: true },
            { key: 'yil', sortable: true },
            { key: 'marka', sortable: true },
            { key: 'plaka', sortable: true },
            { key: 'sanziman', sortable: true },
            { key: 'km', sortable: true }
        ];

        const detailColumns = [
            { key: 'sigorta', sortable: true },
            { key: 'kasko', sortable: true },
            { key: 'muayene', sortable: true },
            { key: 'kredi', sortable: true },
            { key: 'lastik', sortable: true },
            { key: 'utts', sortable: true },
            { key: 'takip', sortable: true },
            { key: 'tramer', sortable: true },
            { key: 'boya', sortable: true },
            { key: 'kullanici', sortable: true },
            { key: 'tescil', sortable: true }
        ];

        // Tüm sütunları birleştir (temel + aktif detay)
        const allColumns = [];

        // Temel sütunları sıraya göre ekle
        stokBaseColumnOrder.forEach(colKey => {
            const col = baseColumns.find(c => c.key === colKey);
            if (col) allColumns.push(col);
        });

        // Aktif detay sütunlarını sıraya göre ekle
        if (stokColumnOrder.length > 0) {
            stokColumnOrder.forEach(colKey => {
                if (stokActiveColumns[colKey]) {
                    const col = detailColumns.find(c => c.key === colKey);
                    if (col) allColumns.push(col);
                }
            });
            // Sırada olmayan ama aktif olan sütunları sona ekle
            detailColumns.forEach(col => {
                if (stokActiveColumns[col.key] && !stokColumnOrder.includes(col.key)) {
                    allColumns.push(col);
                }
            });
        } else {
            // İlk kez - varsayılan sıraya göre ekle
            detailColumns.forEach(col => {
                if (stokActiveColumns[col.key]) {
                    allColumns.push(col);
                }
            });
        }

        let columns = allColumns;

        // Grid sütun genişliklerini hesapla
        const gridTemplateColumns = getColumnWidths(columns);

        return `<tr class="stok-list-header-row" style="grid-template-columns: ${gridTemplateColumns}">${columns.map(col => {
            const sortState = stokSortState[col.key] || null;
            const sortIcon = sortState === 'asc' ? '↑' : sortState === 'desc' ? '↓' : '↕';
            const sortClass = sortState ? 'active' : '';
            
            const draggableAttr = 'draggable="true"';
            
            if (col.sortable) {
                return `
                    <th class="stok-list-header-cell stok-sortable-header" 
                        data-col="${col.key}"
                        ${draggableAttr}
                        ondragstart="handleColumnHeaderDragStart(event, '${col.key}')"
                        ondragover="handleColumnHeaderDragOver(event)"
                        ondrop="handleColumnHeaderDrop(event, '${col.key}')"
                        ondragenter="handleColumnHeaderDragEnter(event)"
                        ondragleave="handleColumnHeaderDragLeave(event)"
                        ondragend="handleColumnHeaderDragEnd(event)"
                        onclick="sortStokList('${col.key}')">
                        <span class="stok-header-text">${getColumnHeaderText(col.key)}</span>
                        <span class="stok-sort-icon ${sortClass}">${sortIcon}</span>
                    </th>
                `;
            } else {
                const headerText = getColumnHeaderText(col.key);
                return `
                    <th class="stok-list-header-cell" 
                        data-col="${col.key}"
                        ${draggableAttr}
                        ondragstart="handleColumnHeaderDragStart(event, '${col.key}')"
                        ondragover="handleColumnHeaderDragOver(event)"
                        ondrop="handleColumnHeaderDrop(event, '${col.key}')"
                        ondragenter="handleColumnHeaderDragEnter(event)"
                        ondragleave="handleColumnHeaderDragLeave(event)"
                        ondragend="handleColumnHeaderDragEnd(event)">
                        ${headerText ? `<span class="stok-header-text">${headerText}</span>` : ''}
                    </th>
                `;
            }
        }).join('')}</tr>`;
    }

    // Veri satırı oluştur
    function createStokDataRow(vehicle, rowNum, branches) {
        const branch = vehicle.branchId ? branches.find(b => b.id === vehicle.branchId) : null;
        const branchName = branch ? branch.name : '-';

        // Base cell'leri stokBaseColumnOrder sırasına göre oluştur
        const baseCellData = {
            'sira': rowNum,
            'sube': branchName,
            'yil': vehicle.year || '-',
            'marka': vehicle.brandModel || '-',
            'plaka': vehicle.plate || '-',
            'sanziman': vehicle.transmission === 'manuel' ? 'Manuel' : vehicle.transmission === 'otomatik' ? 'Otomatik' : '-',
            'km': vehicle.km ? formatNumber(vehicle.km) : '-'
        };

        const baseCells = stokBaseColumnOrder.map(key => ({
            key: key,
            value: baseCellData[key] || '-'
        }));

        const detailCells = [
            { key: 'sigorta', value: vehicle.sigortaDate ? formatDate(vehicle.sigortaDate) : '-' },
            { key: 'kasko', value: vehicle.kaskoDate ? formatDate(vehicle.kaskoDate) : '-' },
            { key: 'muayene', value: vehicle.muayeneDate ? formatDate(vehicle.muayeneDate) : '-' },
            { key: 'kredi', value: vehicle.kredi === 'var' ? 'Var' : vehicle.kredi === 'yok' ? 'Yok' : '-' },
            { key: 'lastik', value: vehicle.lastikDurumu === 'var' ? 'Var' : vehicle.lastikDurumu === 'yok' ? 'Yok' : '-' },
            { key: 'utts', value: vehicle.uttsTanimlandi ? 'Evet' : 'Hayır' },
            { key: 'takip', value: vehicle.takipCihaziMontaj ? 'Evet' : 'Hayır' },
            { key: 'tramer', value: vehicle.tramer === 'var' ? 'Var' : vehicle.tramer === 'yok' ? 'Yok' : '-' },
            { key: 'boya', value: vehicle.boya === 'var' ? 'Var' : vehicle.boya === 'yok' ? 'Yok' : '-' },
            { key: 'kullanici', value: getVehicleUser(vehicle) },
            { key: 'tescil', value: vehicle.tescilDate ? formatDate(vehicle.tescilDate) : '-' }
        ];

        let cells = [...baseCells];

        // Aktif detay sütunlarını sıraya göre ekle
        if (stokColumnOrder.length > 0) {
            // Kaydedilmiş sıraya göre ekle
            stokColumnOrder.forEach(cellKey => {
                if (stokActiveColumns[cellKey]) {
                    const cell = detailCells.find(c => c.key === cellKey);
                    if (cell) cells.push(cell);
                }
            });
            // Sırada olmayan ama aktif olan sütunları sona ekle
            detailCells.forEach(cell => {
                if (stokActiveColumns[cell.key] && !stokColumnOrder.includes(cell.key)) {
                    cells.push(cell);
                }
            });
        } else {
            // İlk kez - varsayılan sıraya göre ekle
            detailCells.forEach(cell => {
                if (stokActiveColumns[cell.key]) {
                    cells.push(cell);
                }
            });
        }

        // Grid sütun genişliklerini hesapla (header ile aynı sütun yapısı)
        const columnKeys = cells.map(c => ({ key: c.key }));
        const gridTemplateColumns = getColumnWidths(columnKeys);

        return `<tr class="stok-list-row" style="grid-template-columns: ${gridTemplateColumns}">${cells.map(cell =>
            `<td class="stok-list-cell" data-col="${cell.key}">${escapeHtml(cell.value)}</td>`
        ).join('')}</tr>`;
    }

    // Sıralama uygula
    function applyStokSorting(vehicles) {
        const sortedVehicles = [...vehicles];
        const branches = getBranches();
        
        // Aktif sıralama var mı kontrol et
        const activeSort = Object.entries(stokSortState).find(([key, dir]) => dir !== null);
        if (!activeSort) return sortedVehicles;
        
        const [columnKey, direction] = activeSort;
        
        sortedVehicles.sort((a, b) => {
            if (columnKey === 'sanziman') {
                // Manuel → Otomatik (asc), Otomatik → Manuel (desc)
                const aVal = a.transmission === 'manuel' ? 0 : a.transmission === 'otomatik' ? 1 : 2;
                const bVal = b.transmission === 'manuel' ? 0 : b.transmission === 'otomatik' ? 1 : 2;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else if (columnKey === 'km') {
                // Düşük → Yüksek (asc), Yüksek → Düşük (desc)
                const aVal = parseFloat((a.km || '0').replace(/[^\d]/g, '')) || 0;
                const bVal = parseFloat((b.km || '0').replace(/[^\d]/g, '')) || 0;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else if (columnKey === 'yil') {
                // Eski → Yeni (asc), Yeni → Eski (desc)
                const aVal = parseInt(a.year) || 0;
                const bVal = parseInt(b.year) || 0;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else if (columnKey === 'sube') {
                // A-Z (asc), Z-A (desc)
                const aBranch = a.branchId ? branches.find(b => b.id === a.branchId) : null;
                const bBranch = b.branchId ? branches.find(b => b.id === b.branchId) : null;
                const aVal = (aBranch ? aBranch.name : '-').toLowerCase();
                const bVal = (bBranch ? bBranch.name : '-').toLowerCase();
                return direction === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
            } else if (columnKey === 'marka') {
                // A-Z (asc), Z-A (desc)
                const aVal = (a.brandModel || '').toLowerCase();
                const bVal = (b.brandModel || '').toLowerCase();
                return direction === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
            } else if (columnKey === 'plaka') {
                // A-Z (asc), Z-A (desc)
                const aVal = (a.plate || '').toLowerCase();
                const bVal = (b.plate || '').toLowerCase();
                return direction === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
            } else {
                // Diğer sütunlar için alfabetik/sayısal sıralama
                const aVal = String(a[columnKey] || '').toLowerCase();
                const bVal = String(b[columnKey] || '').toLowerCase();
                return direction === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
            }
        });
        
        return sortedVehicles;
    }

    // Sıralama fonksiyonu
    window.sortStokList = function(columnKey) {
        const currentState = stokSortState[columnKey];
        
        // Sıralama durumunu değiştir: null → asc → desc → null
        if (!currentState || currentState === null) {
            // Tüm sütunları sıfırla, sadece bu sütunu asc yap
            stokSortState = {};
            stokSortState[columnKey] = 'asc';
        } else if (currentState === 'asc') {
            stokSortState[columnKey] = 'desc';
        } else {
            stokSortState[columnKey] = null;
        }
        
        renderStokList();
    };

    // Sıralama event listener'larını ekle
    function attachStokSortListeners() {
        // Zaten onclick ile bağlandı, ek bir şey gerekmiyor
    }

    /** Mobil: Liste scroll container'da tek hamlede sadece yatay veya sadece dikey kayma (eksen kilidi) */
    function setupStokListTouchAxisLock() {
        if (!window.matchMedia || !window.matchMedia('(max-width: 640px)').matches) return;
        const listContainer = document.getElementById('stok-list-container');
        const scrollEl = listContainer && listContainer.querySelector(':scope > .stok-list-container');
        if (!scrollEl) return;

        let startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0, lockedAxis = null;

        const onStart = (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startScrollLeft = scrollEl.scrollLeft;
            startScrollTop = scrollEl.scrollTop;
            lockedAxis = null;
        };
        const onMove = (e) => {
            if (e.touches.length !== 1) return;
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            const dx = x - startX;
            const dy = y - startY;
            if (lockedAxis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }
            if (lockedAxis === 'x') {
                const next = Math.max(0, Math.min(scrollEl.scrollWidth - scrollEl.clientWidth, startScrollLeft - dx));
                scrollEl.scrollLeft = next;
                scrollEl.scrollTop = startScrollTop;
                e.preventDefault();
            } else if (lockedAxis === 'y') {
                const next = Math.max(0, Math.min(scrollEl.scrollHeight - scrollEl.clientHeight, startScrollTop - dy));
                scrollEl.scrollTop = next;
                scrollEl.scrollLeft = startScrollLeft;
                e.preventDefault();
            }
        };
        const onEnd = () => { lockedAxis = null; };

        scrollEl.addEventListener('touchstart', onStart, { passive: true });
        scrollEl.addEventListener('touchmove', onMove, { passive: false });
        scrollEl.addEventListener('touchend', onEnd, { passive: true });
        scrollEl.addEventListener('touchcancel', onEnd, { passive: true });
    }

    // Detay menüsünü render et
    function renderStokDetailMenu() {
        const menu = document.getElementById('stok-detail-menu');
        const btn = document.querySelector('.stok-detail-add-btn');
        if (!menu) return;
        
        const detailOptions = [
            { key: 'sigorta', label: 'Sigorta T.' },
            { key: 'kasko', label: 'Kasko T.' },
            { key: 'muayene', label: 'Muayene' },
            { key: 'kredi', label: 'Kredi/Rehin' },
            { key: 'lastik', label: 'Lastik D.' },
            { key: 'utts', label: 'UTTS' },
            { key: 'takip', label: 'Taşıt Tkp.' },
            { key: 'tramer', label: 'Tramer' },
            { key: 'boya', label: 'Kaporta' },
            { key: 'kullanici', label: 'Kullanıcı' },
            { key: 'tescil', label: 'Tescil Tarihi' }
        ];
        
        // Aktif sütunları sıraya göre, pasifleri sona ekle
        const activeOptions = [];
        const inactiveOptions = [];
        
        detailOptions.forEach(opt => {
            if (stokActiveColumns[opt.key]) {
                activeOptions.push(opt);
            } else {
                inactiveOptions.push(opt);
            }
        });
        
        // Aktif sütunları sıraya göre sırala
        const sortedActiveOptions = stokColumnOrder
            .map(key => activeOptions.find(opt => opt.key === key))
            .filter(opt => opt !== undefined)
            .concat(activeOptions.filter(opt => !stokColumnOrder.includes(opt.key)));
        
        const allOptions = [...sortedActiveOptions, ...inactiveOptions];
        
        menu.innerHTML = allOptions.map((opt) => {
            const isActive = stokActiveColumns[opt.key];
            
        return `
                <div class="stok-detail-menu-item ${isActive ? 'draggable' : ''}" 
                     data-column-key="${opt.key}">
                    <button class="stok-detail-menu-btn ${isActive ? 'active' : ''}" 
                            onclick="toggleStokDetailColumn('${opt.key}')"
                            title="${escapeHtml(opt.label)}">
                        <span>${escapeHtml(opt.label)}</span>
                    </button>
            </div>
        `;
        }).join('');
        
        // Buton metinlerini kontrol et ve gerekirse küçült
        setTimeout(() => {
            const buttons = menu.querySelectorAll('.stok-detail-menu-btn');
            buttons.forEach(btn => {
                const span = btn.querySelector('span');
                if (span && span.scrollWidth > btn.offsetWidth) {
                    span.style.fontSize = '9px';
                }
            });
        }, 10);
    }

    // Detay menü toggle (tek tıkla aç, tek tıkla kapat)
    window.toggleStokDetailMenu = function() {
        stokDetailMenuOpen = !stokDetailMenuOpen;
        const menu = document.getElementById('stok-detail-menu');
        const buttons = document.querySelectorAll('.stok-detail-add-btn');
        if (menu) {
            menu.classList.toggle('stok-detail-menu-open', stokDetailMenuOpen);
        }
        buttons.forEach(function(btn) {
            if (stokDetailMenuOpen) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    // Detay sütun ekleme/çıkarma
    window.toggleStokDetailColumn = function(columnKey) {
        const wasActive = stokActiveColumns[columnKey];
        stokActiveColumns[columnKey] = !stokActiveColumns[columnKey];
        
        if (stokActiveColumns[columnKey] && !stokColumnOrder.includes(columnKey)) {
            // Yeni aktif olan sütunu sıranın sonuna ekle
            stokColumnOrder.push(columnKey);
        } else if (!stokActiveColumns[columnKey]) {
            // Pasif olan sütunu sıradan çıkar
            stokColumnOrder = stokColumnOrder.filter(key => key !== columnKey);
        }
        
        saveStokColumnState();
        // Buton seçimi yapıldığında menü açık kalsın - renderStokList'te durum korunacak
        renderStokList();
    };

    // Sürükle-bırak için değişkenler
    let draggedColumnKey = null;

    // Sütun başlığından sürükle başlatıldığında
    window.handleColumnHeaderDragStart = function(event, columnKey) {
        const detailColumns = ['sigorta', 'kasko', 'muayene', 'kredi', 'lastik', 'utts', 'takip', 'tramer', 'boya', 'kullanici', 'tescil'];
        const baseColumns = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km'];
        
        // Detay sütunları için aktif kontrolü
        if (detailColumns.includes(columnKey) && !stokActiveColumns[columnKey]) {
            event.preventDefault();
            return;
        }
        
        draggedColumnKey = columnKey;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', columnKey);
        
        // Tüm satırı vurgula
        const allRows = document.querySelectorAll('.stok-list-row');
        allRows.forEach(row => {
            const cell = row.querySelector(`[data-col="${columnKey}"]`);
            if (cell) {
                cell.style.opacity = '0.5';
            }
        });
        event.currentTarget.style.opacity = '0.5';
    };

    // Sütun başlığı üzerine geldiğinde
    window.handleColumnHeaderDragOver = function(event) {
        if (draggedColumnKey) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
    };

    // Sütun başlığına giriş yaptığında
    window.handleColumnHeaderDragEnter = function(event) {
        if (draggedColumnKey) {
            const targetKey = event.currentTarget.dataset.col;
            const detailColumns = ['sigorta', 'kasko', 'muayene', 'kredi', 'lastik', 'utts', 'takip', 'tramer', 'boya', 'kullanici', 'tescil'];
            const baseColumns = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km'];
            
            if (targetKey && targetKey !== draggedColumnKey) {
                // Temel sütunlar her zaman kabul edilir
                if (baseColumns.includes(targetKey)) {
                    event.preventDefault();
                    event.currentTarget.classList.add('drag-over');
                }
                // Detay sütunlar sadece aktifse kabul edilir
                else if (detailColumns.includes(targetKey) && stokActiveColumns[targetKey]) {
                    event.preventDefault();
                    event.currentTarget.classList.add('drag-over');
                }
            }
        }
    };

    // Sütun başlığından çıkış yaptığında
    window.handleColumnHeaderDragLeave = function(event) {
        event.currentTarget.classList.remove('drag-over');
    };

    // Sütun başlığına bırakıldığında
    window.handleColumnHeaderDrop = function(event, targetColumnKey) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
        
        if (!draggedColumnKey || draggedColumnKey === targetColumnKey) {
            draggedColumnKey = null;
            return;
        }

        const detailColumns = ['sigorta', 'kasko', 'muayene', 'kredi', 'lastik', 'utts', 'takip', 'tramer', 'boya', 'kullanici', 'tescil'];
        const baseColumns = ['sira', 'sube', 'yil', 'marka', 'plaka', 'sanziman', 'km'];
        
        const isDraggedBase = baseColumns.includes(draggedColumnKey);
        const isTargetBase = baseColumns.includes(targetColumnKey);
        const isDraggedDetail = detailColumns.includes(draggedColumnKey);
        const isTargetDetail = detailColumns.includes(targetColumnKey);

        // Temel sütunlar arasında yer değiştirme
        if (isDraggedBase && isTargetBase) {
            const draggedIndex = stokBaseColumnOrder.indexOf(draggedColumnKey);
            const targetIndex = stokBaseColumnOrder.indexOf(targetColumnKey);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                stokBaseColumnOrder.splice(draggedIndex, 1);
                stokBaseColumnOrder.splice(targetIndex, 0, draggedColumnKey);
                saveStokColumnState();
                renderStokList();
            }
        }
        // Detay sütunlar arasında yer değiştirme
        else if (isDraggedDetail && isTargetDetail) {
            if (!stokActiveColumns[draggedColumnKey] || !stokActiveColumns[targetColumnKey]) {
                draggedColumnKey = null;
                return;
            }
            
            const draggedIndex = stokColumnOrder.indexOf(draggedColumnKey);
            const targetIndex = stokColumnOrder.indexOf(targetColumnKey);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                stokColumnOrder.splice(draggedIndex, 1);
                stokColumnOrder.splice(targetIndex, 0, draggedColumnKey);
                saveStokColumnState();
                renderStokList();
            }
        }
        // Temel ve detay sütunlar arasında yer değiştirme (temel sütunların sonuna veya detay sütunların başına)
        else if (isDraggedBase && isTargetDetail && stokActiveColumns[targetColumnKey]) {
            // Temel sütunu, detay sütununun yerine koy (detay sütununu temel sütunların sonuna al)
            const draggedIndex = stokBaseColumnOrder.indexOf(draggedColumnKey);
            const targetDetailIndex = stokColumnOrder.indexOf(targetColumnKey);
            
            if (draggedIndex !== -1 && targetDetailIndex !== -1) {
                // Temel sütunu listeden çıkar
                stokBaseColumnOrder.splice(draggedIndex, 1);
                // Detay sütununu temel sütunların sonuna ekle
                stokBaseColumnOrder.push(targetColumnKey);
                // Detay sütununu detay listesinden çıkar
                stokColumnOrder.splice(targetDetailIndex, 1);
                // Temel sütunu detay listesine ekle
                stokColumnOrder.splice(targetDetailIndex, 0, draggedColumnKey);
                saveStokColumnState();
                renderStokList();
            }
        }
        else if (isDraggedDetail && isTargetBase && stokActiveColumns[draggedColumnKey]) {
            // Detay sütununu, temel sütununun yerine koy (temel sütununu detay sütunların başına al)
            const draggedDetailIndex = stokColumnOrder.indexOf(draggedColumnKey);
            const targetIndex = stokBaseColumnOrder.indexOf(targetColumnKey);
            
            if (draggedDetailIndex !== -1 && targetIndex !== -1) {
                // Detay sütununu listeden çıkar
                stokColumnOrder.splice(draggedDetailIndex, 1);
                // Temel sütununu detay listesinin başına ekle
                stokColumnOrder.unshift(targetColumnKey);
                // Temel sütununu temel listesinden çıkar
                stokBaseColumnOrder.splice(targetIndex, 1);
                // Detay sütununu temel listesine ekle
                stokBaseColumnOrder.splice(targetIndex, 0, draggedColumnKey);
                saveStokColumnState();
                renderStokList();
            }
        }
        
        draggedColumnKey = null;
    };

    // Sütun başlığı drag bitince
    window.handleColumnHeaderDragEnd = function(event) {
        // Tüm satırları normale döndür
        const allRows = document.querySelectorAll('.stok-list-row');
        allRows.forEach(row => {
            const cells = row.querySelectorAll('.stok-list-cell');
            cells.forEach(cell => {
                cell.style.opacity = '1';
            });
        });
        
        // Tüm başlıkları normale döndür
        document.querySelectorAll('.stok-list-header-cell').forEach(cell => {
            cell.style.opacity = '1';
            cell.classList.remove('drag-over');
        });
        
        draggedColumnKey = null;
    };

    // Yardımcı fonksiyonlar
    function formatNumber(value) {
        if (!value) return '-';
        const numStr = String(value).replace(/[^\d]/g, '');
        if (!numStr) return '-';
        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    }

    function getVehicleUser(vehicle) {
        if (!vehicle.assignedUserId) return '-';
        const users = getUsers();
        const user = users.find(u => u.id === vehicle.assignedUserId);
        return user ? user.name : '-';
    }

    // Grid görünümüne geri dön
    window.goBackToStokGrid = function() {
        stokCurrentBranchId = null;
        stokDetailMenuOpen = false;
        const headerActions = document.getElementById('reports-list-header-actions');
        if (headerActions) {
            headerActions.innerHTML = '';
            headerActions.setAttribute('aria-hidden', 'true');
        }
        renderStokView();
    };

    // Ana render fonksiyonu
    window.renderStokView = function() {
        if (stokCurrentBranchId === null) {
            // Grid görünümü
            renderStokBranchGrid();
        } else {
            // Liste görünümü
            renderStokList();
        }
    };

    // Excel / Yazdır için ortak veri hazırlama (aynı filtre, sütun, tarih)
    function getStokReportExportData() {
        if (stokCurrentBranchId === null) return null;
        let vehicles = getVehicles();
        const branches = getBranches();

        if (stokCurrentBranchId === 'all') { /* tüm taşıtlar */ } else if (stokCurrentBranchId) {
            vehicles = vehicles.filter(v => v.branchId === stokCurrentBranchId);
        }
        const searchTerm = window.stokSearchTerm || '';
        if (searchTerm) {
            vehicles = vehicles.filter(v => {
                const year = String(v.year || '').toLowerCase();
                const brandModel = (v.brandModel || '').toLowerCase();
                const user = getVehicleUser(v).toLowerCase();
                const branch = v.branchId ? (branches.find(b => b.id === v.branchId)?.name || '').toLowerCase() : '';
                return year.includes(searchTerm) || brandModel.includes(searchTerm) || user.includes(searchTerm) || branch.includes(searchTerm);
            });
        }
        vehicles = applyStokSorting(vehicles);
        if (vehicles.length === 0) return null;

        const activeColumns = [];
        stokBaseColumnOrder.forEach(key => { activeColumns.push({ key, isBase: true }); });
        stokColumnOrder.forEach(key => { if (stokActiveColumns[key]) activeColumns.push({ key, isBase: false }); });

        const startDate = document.getElementById('stok-date-start')?.value || '';
        const endDate = document.getElementById('stok-date-end')?.value || '';
        let dateRangeText = '';
        if (endDate) {
            const fmt = (d) => { if (!d) return ''; const x = new Date(d); return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}`; };
            dateRangeText = startDate ? `${fmt(startDate)} - ${fmt(endDate)}` : fmt(endDate);
        } else {
            const t = new Date();
            dateRangeText = `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
        }
        let titleText = 'MEDİSA - TAŞIT STOK DURUM RAPORU';
        if (stokCurrentBranchId !== 'all' && stokCurrentBranchId) {
            const b = branches.find(b => b.id === stokCurrentBranchId);
            if (b) titleText = `${b.name} - TAŞIT STOK DURUM RAPORU`;
        }
        return { vehicles, activeColumns, titleText, dateRangeText, branches };
    }

    function getStokCellValue(vehicle, col, index) {
        let value = '-';
        if (col.isBase) {
            switch (col.key) {
                case 'sira': value = index + 1; break;
                case 'sube': value = vehicle.branchId ? (getBranches().find(b => b.id === vehicle.branchId)?.name || '-') : '-'; break;
                case 'yil': value = vehicle.year || '-'; break;
                case 'marka': value = vehicle.brandModel || '-'; break;
                case 'plaka': value = vehicle.plate || '-'; break;
                case 'sanziman': value = vehicle.transmission === 'manuel' ? 'Manuel' : vehicle.transmission === 'otomatik' ? 'Otomatik' : '-'; break;
                case 'km': value = vehicle.km ? formatNumber(vehicle.km) : '-'; break;
            }
        } else {
            switch (col.key) {
                case 'sigorta': value = vehicle.sigortaDate ? formatDate(vehicle.sigortaDate) : '-'; break;
                case 'kasko': value = vehicle.kaskoDate ? formatDate(vehicle.kaskoDate) : '-'; break;
                case 'muayene': value = vehicle.muayeneDate ? formatDate(vehicle.muayeneDate) : '-'; break;
                case 'kredi': value = vehicle.kredi === 'var' ? 'Var' : vehicle.kredi === 'yok' ? 'Yok' : '-'; break;
                case 'lastik': value = vehicle.lastikDurumu === 'var' ? 'Var' : vehicle.lastikDurumu === 'yok' ? 'Yok' : '-'; break;
                case 'utts': value = vehicle.uttsTanimlandi ? 'Evet' : 'Hayır'; break;
                case 'takip': value = vehicle.takipCihaziMontaj ? 'Evet' : 'Hayır'; break;
                case 'tramer': value = vehicle.tramer === 'var' ? 'Var' : vehicle.tramer === 'yok' ? 'Yok' : '-'; break;
                case 'boya': value = vehicle.boya === 'var' ? 'Var' : vehicle.boya === 'yok' ? 'Yok' : '-'; break;
                case 'kullanici': value = getVehicleUser(vehicle); break;
                case 'tescil': value = vehicle.tescilDate ? formatDate(vehicle.tescilDate) : '-'; break;
            }
        }
        return value;
    }

    // Excel'e aktar
    window.exportStokToExcel = async function() {
        try {
            await window.loadExcelJS();
            const Excel = ExcelJS || window.ExcelJS;
        const data = getStokReportExportData();
        if (!data) {
            alert('Lütfen önce bir şube seçin veya "Tümü" seçeneğini kullanın.');
            return;
        }
        const { vehicles, activeColumns, titleText, dateRangeText, branches } = data;
        if (vehicles.length === 0) {
            alert('Export Edilecek Taşıt Bulunamadı.');
            return;
        }

        // ExcelJS ile Excel oluştur
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Stok Raporu');
        
        // Başlık satırı
        const titleRow = worksheet.addRow([titleText]);
        worksheet.mergeCells(1, 1, 1, activeColumns.length);
        const titleCell = titleRow.getCell(1);
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E5E5' }
        };
        titleCell.font = { bold: true, color: { argb: 'FF000000' } };
        titleCell.border = {
            top: { style: 'thin', color: { argb: 'FF333333' } },
            left: { style: 'thin', color: { argb: 'FF333333' } },
            bottom: { style: 'thin', color: { argb: 'FF333333' } },
            right: { style: 'thin', color: { argb: 'FF333333' } }
        };
        titleRow.height = 25;
        
        // Tarih satırı
        const dateRow = worksheet.addRow([dateRangeText]);
        worksheet.mergeCells(2, 1, 2, activeColumns.length);
        const dateCell = dateRow.getCell(1);
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E5E5' }
        };
        dateCell.font = { color: { argb: 'FF000000' } };
        dateCell.border = {
            top: { style: 'thin', color: { argb: 'FF333333' } },
            left: { style: 'thin', color: { argb: 'FF333333' } },
            bottom: { style: 'thin', color: { argb: 'FF333333' } },
            right: { style: 'thin', color: { argb: 'FF333333' } }
        };
        dateRow.height = 20;
        
        // Boş satır
        worksheet.addRow([]);
        
        // Sütun başlıkları
        const headerRow = worksheet.addRow(activeColumns.map(col => getColumnHeaderText(col.key)));
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF404040' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF333333' } },
                left: { style: 'thin', color: { argb: 'FF333333' } },
                bottom: { style: 'thin', color: { argb: 'FF333333' } },
                right: { style: 'thin', color: { argb: 'FF333333' } }
            };
        });
        headerRow.height = 20;
        
        // Veri satırları
        vehicles.forEach((vehicle, index) => {
            const row = activeColumns.map(col => getStokCellValue(vehicle, col, index));
            const isEven = index % 2 === 0;
            const dataRow = worksheet.addRow(row);
            dataRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFE5E5E5' }
                };
                cell.font = { color: { argb: 'FF000000' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF333333' } },
                    left: { style: 'thin', color: { argb: 'FF333333' } },
                    bottom: { style: 'thin', color: { argb: 'FF333333' } },
                    right: { style: 'thin', color: { argb: 'FF333333' } }
                };
            });
        });
        
        // Sütun genişliklerini içeriğe göre otomatik ayarla
        activeColumns.forEach((col, colIndex) => {
            let maxLength = getColumnHeaderText(col.key).length;
            
            // Veri satırlarındaki en uzun metni bul
            vehicles.forEach((vehicle) => {
                let value = '-';
                
                if (col.isBase) {
                    switch(col.key) {
                        case 'sira':
                            value = String(vehicles.indexOf(vehicle) + 1);
                            break;
                        case 'sube':
                            const branch = vehicle.branchId ? branches.find(b => b.id === vehicle.branchId) : null;
                            value = branch ? branch.name : '-';
                            break;
                        case 'yil':
                            value = String(vehicle.year || '-');
                            break;
                        case 'marka':
                            value = vehicle.brandModel || '-';
                            break;
                        case 'plaka':
                            value = vehicle.plate || '-';
                            break;
                        case 'sanziman':
                            value = vehicle.transmission === 'manuel' ? 'Manuel' : vehicle.transmission === 'otomatik' ? 'Otomatik' : '-';
                            break;
                        case 'km':
                            value = vehicle.km ? formatNumber(vehicle.km) : '-';
                            break;
                    }
                } else {
                    switch(col.key) {
                        case 'sigorta':
                            value = vehicle.sigortaDate ? formatDate(vehicle.sigortaDate) : '-';
                            break;
                        case 'kasko':
                            value = vehicle.kaskoDate ? formatDate(vehicle.kaskoDate) : '-';
                            break;
                        case 'muayene':
                            value = vehicle.muayeneDate ? formatDate(vehicle.muayeneDate) : '-';
                            break;
                        case 'kredi':
                            value = vehicle.kredi === 'var' ? 'Var' : vehicle.kredi === 'yok' ? 'Yok' : '-';
                            break;
                        case 'lastik':
                            value = vehicle.lastikDurumu === 'var' ? 'Var' : vehicle.lastikDurumu === 'yok' ? 'Yok' : '-';
                            break;
                        case 'utts':
                            value = vehicle.uttsTanimlandi ? 'Evet' : 'Hayır';
                            break;
                        case 'takip':
                            value = vehicle.takipCihaziMontaj ? 'Evet' : 'Hayır';
                            break;
                        case 'tramer':
                            value = vehicle.tramer === 'var' ? 'Var' : vehicle.tramer === 'yok' ? 'Yok' : '-';
                            break;
                        case 'boya':
                            value = vehicle.boya === 'var' ? 'Var' : vehicle.boya === 'yok' ? 'Yok' : '-';
                            break;
                        case 'kullanici':
                            value = getVehicleUser(vehicle);
                            break;
                        case 'tescil':
                            value = vehicle.tescilDate ? formatDate(vehicle.tescilDate) : '-';
                            break;
                    }
                }
                
                const valueLength = String(value).length;
                if (valueLength > maxLength) {
                    maxLength = valueLength;
                }
            });
            
            // Minimum genişlik: metin uzunluğu + 2 (padding için)
            const column = worksheet.getColumn(colIndex + 1);
            column.width = Math.max(maxLength + 2, 8); // Minimum 8 karakter genişlik
        });
        
        // Dosya adı
        const branchName = stokCurrentBranchId === 'all' ? 'Tumu' : (branches.find(b => b.id === stokCurrentBranchId)?.name || 'Stok');
        const fileName = `MEDISA_Stok_Raporu_${branchName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // İndir
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel export hatası:', error);
            alert('Excel dosyası oluşturulurken bir hata oluştu: ' + (error.message || error));
        }
    };

    // Arama kutusunu aç/kapat
    window.toggleStokSearch = function() {
        const container = document.getElementById('stok-search-container');
        const input = document.getElementById('stok-search-input');
        
        if (container) {
            if (container.classList.contains('open')) {
                container.classList.remove('open');
                if (input) {
                    input.value = '';
                    handleStokSearch('');
                }
            } else {
                container.classList.add('open');
                setTimeout(() => {
                    if (input) input.focus();
                }, 100);
            }
        }
    };

    // Arama yap
    window.handleStokSearch = function(searchTerm) {
        const searchValue = searchTerm.toLowerCase().trim();
        
        // Arama terimini sakla (renderStokList'te kullanılacak)
        window.stokSearchTerm = searchValue;
        
        // Listeyi yeniden render et
        if (stokCurrentBranchId !== null) {
            renderStokList();
        }
    };

    // Yazdır – Excel ile aynı veriyi tablo olarak yazdırır (ekran görüntüsü değil)
    const stokPrintHeaders = { sira:'No.', sube:'Şube', yil:'Yıl', marka:'Marka/Model', plaka:'Plaka', sanziman:'Şanzıman', km:'KM', sigorta:'Sigorta Bitiş', kasko:'Kasko Bitiş', muayene:'Muayene T.', kredi:'Kredi/Rehin', lastik:'Lastikler', utts:'UTTS', takip:'Takip Cihazı', tramer:'Tramer', boya:'Boya Değişen', kullanici:'Kullanıcı', tescil:'Tescil Tarihi' };
    window.printStokReport = function() {
        const data = getStokReportExportData();
        if (!data) {
            alert('Lütfen önce bir şube seçin veya "Tümü" seçeneğini kullanın.');
            return;
        }
        if (data.vehicles.length === 0) {
            alert('Yazdırılacak Taşıt Bulunamadı.');
            return;
        }
        const { vehicles, activeColumns, titleText, dateRangeText } = data;
        const thead = activeColumns.map(col => `<th>${escapeHtml(stokPrintHeaders[col.key] || col.key)}</th>`).join('');
        const rows = vehicles.map((vehicle, index) => {
            const cells = activeColumns.map(col => `<td>${escapeHtml(String(getStokCellValue(vehicle, col, index)))}</td>`).join('');
            return `<tr class="${index % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
        }).join('');
        const el = document.createElement('div');
        el.id = 'stok-print-area';
        el.innerHTML = `<h1 class="stok-print-title">${escapeHtml(titleText)}</h1><p class="stok-print-date">${escapeHtml(dateRangeText)}</p><table class="stok-print-table"><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table>`;
        document.body.appendChild(el);
        /* Detay (sütun) çoksa yatay sayfa: 9+ sütunda landscape */
        let landscapeStyle = null;
        if (activeColumns.length >= 9) {
            landscapeStyle = document.createElement('style');
            landscapeStyle.id = 'stok-print-landscape';
            landscapeStyle.textContent = '@media print { @page { size: landscape; } }';
            document.head.appendChild(landscapeStyle);
        }
        const cleanup = () => {
            el.remove();
            if (landscapeStyle && landscapeStyle.parentNode) landscapeStyle.remove();
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    };

    // --- 2. SEKME: KULLANICI GÖRÜNÜMÜ ---
    
    // Kullanıcı Grid Render
    function renderKullaniciBranchGrid() {
        const gridContainer = document.getElementById('kullanici-branch-grid');
        const listContainer = document.getElementById('kullanici-list-container');
        
        if (!gridContainer) return;
        
        const branches = getBranches();
        const users = getUsers();
        
        // Grid görünümünü göster, liste görünümünü gizle
        if (gridContainer) gridContainer.style.display = 'flex';
        if (listContainer) listContainer.style.display = 'none';
        
        // "Tümü" kartı
        const totalCount = users.length;
        let html = `
            <div class="stok-branch-card all-card ${kullaniciCurrentBranchId === 'all' ? 'active' : ''}" 
                 onclick="selectKullaniciBranch('all')">
                <div class="stok-branch-name">Tümü</div>
                <div class="stok-branch-count">${totalCount} Kullanıcı</div>
            </div>
        `;
        
        // Şube kartları
        branches.forEach(branch => {
            const branchUsers = users.filter(u => u.branchId === branch.id);
            const count = branchUsers.length;
            const isActive = kullaniciCurrentBranchId === branch.id;
            
            html += `
                <div class="stok-branch-card ${isActive ? 'active' : ''}" 
                     onclick="selectKullaniciBranch('${escapeHtml(branch.id)}')">
                    <div class="stok-branch-name">${escapeHtml(branch.name)}</div>
                    <div class="stok-branch-count">${count} Kullanıcı</div>
                </div>
            `;
        });
        
        gridContainer.innerHTML = html;
    }
    
    // Şube Seçimi
    window.selectKullaniciBranch = function(branchId) {
        kullaniciCurrentBranchId = branchId;
        renderKullaniciView();
    };
    
    // Liste Görünümü Render
    function renderKullaniciList() {
        const gridContainer = document.getElementById('kullanici-branch-grid');
        const listContainer = document.getElementById('kullanici-list-container');
        
        if (!listContainer) return;
        
        // Grid görünümünü gizle, liste görünümünü göster
        if (gridContainer) gridContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
        
        let users = getUsers();
        const vehicles = getVehicles();
        const branches = getBranches();
        
        // Filtreleme
        if (kullaniciCurrentBranchId === 'all') {
            // Tüm kullanıcılar
        } else if (kullaniciCurrentBranchId) {
            users = users.filter(u => u.branchId === kullaniciCurrentBranchId);
        } else {
            // Grid görünümünde, liste render edilmemeli
            return;
        }
        
        // Arama filtresi
        if (kullaniciSearchTerm) {
            users = users.filter(u => {
                const userName = (u.name || '').toLowerCase();
                const userPhone = (u.phone || '').toLowerCase();
                const userEmail = (u.email || '').toLowerCase();
                const assignedVehicle = vehicles.find(v => v.assignedUserId === u.id);
                const vehiclePlate = assignedVehicle ? (assignedVehicle.plate || '').toLowerCase() : '';
                const vehicleBrand = assignedVehicle ? (assignedVehicle.brandModel || '').toLowerCase() : '';
                
                return userName.includes(kullaniciSearchTerm) || 
                       userPhone.includes(kullaniciSearchTerm) || 
                       userEmail.includes(kullaniciSearchTerm) ||
                       vehiclePlate.includes(kullaniciSearchTerm) ||
                       vehicleBrand.includes(kullaniciSearchTerm);
            });
        }
        
        // Alfabetik sıralama
        users.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'tr');
        });
        
        if (users.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">Kullanıcı bulunamadı.</div>';
            return;
        }
        
        let html = `
            <div class="kullanici-list-top-controls">
                <button class="stok-back-btn" onclick="goBackToKullaniciGrid()" title="Geri Dön">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <div class="kullanici-export-controls">
                    <div class="kullanici-export-right">
                        <div id="kullanici-search-container" class="stok-search-container">
                            <input type="text" id="kullanici-search-input" class="stok-search-input" placeholder="İsim, telefon, e-posta, plaka, marka ara..." oninput="handleKullaniciSearch(this.value)">
                        </div>
                        <button class="stok-search-btn" onclick="toggleKullaniciSearch()" title="Ara">
                            🔍
                        </button>
                    </div>
                </div>
            </div>
            <div class="kullanici-list-items">
        `;
        
        users.forEach(u => {
            const assignedVehicle = vehicles.find(v => v.assignedUserId === u.id);
            const vehiclePlate = assignedVehicle ? (assignedVehicle.plate || '-') : '-';
            const vehicleBrand = assignedVehicle ? (assignedVehicle.brandModel || '-') : '-';
            
            html += `
                <div class="kullanici-list-item" onclick="showKullaniciDetail('${u.id}')">
                    <div class="kullanici-list-item-left">
                        <div class="kullanici-list-item-name">${escapeHtml(u.name || '-')}</div>
                    </div>
                    <div class="kullanici-list-item-right">
                        <div class="kullanici-list-item-plate">${escapeHtml(vehiclePlate)}</div>
                        <div class="kullanici-list-item-brand">${escapeHtml(vehicleBrand)}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        listContainer.innerHTML = html;
    }
    
    // Grid'e Dönüş
    window.goBackToKullaniciGrid = function() {
        kullaniciCurrentBranchId = null;
        kullaniciSearchTerm = '';
        renderKullaniciView();
    };
    
    // Arama kutusunu aç/kapat
    window.toggleKullaniciSearch = function() {
        const container = document.getElementById('kullanici-search-container');
        const input = document.getElementById('kullanici-search-input');
        
        if (container) {
            if (container.classList.contains('open')) {
                container.classList.remove('open');
                if (input) {
                    input.value = '';
                    handleKullaniciSearch('');
                }
            } else {
                container.classList.add('open');
                setTimeout(() => {
                    if (input) input.focus();
                }, 100);
            }
        }
    };
    
    // Arama yap
    window.handleKullaniciSearch = function(searchTerm) {
        kullaniciSearchTerm = searchTerm.toLowerCase().trim();
        if (kullaniciCurrentBranchId !== null) {
            renderKullaniciList();
        }
    };
    
    // Kullanıcı Detay Göster
    window.showKullaniciDetail = function(userId) {
        kullaniciCurrentUserId = userId;
        const users = getUsers();
        const vehicles = getVehicles();
        const branches = getBranches();
        
        const user = users.find(u => u.id === userId);
        if (!user) {
            alert('Kullanıcı bulunamadı!');
            return;
        }
        
        const listContainer = document.getElementById('kullanici-list-container');
        if (!listContainer) return;
        
        // Kullanıcıya atanmış tüm taşıtları bul
        const assignedVehicles = vehicles.filter(v => v.assignedUserId === userId);
        
        // Kullanıcıya atanmış taşıtların events'lerini topla
        const userEvents = [];
        assignedVehicles.forEach(vehicle => {
            if (vehicle.events && Array.isArray(vehicle.events)) {
                vehicle.events.forEach(event => {
                    userEvents.push({
                        ...event,
                        vehiclePlate: vehicle.plate || '-',
                        vehicleBrand: vehicle.brandModel || '-'
                    });
                });
            }
        });
        
        // Tarihe göre sırala (en yeni üstte)
        userEvents.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
        
        // Görev tanımı label
        const roleLabels = {
            'admin': 'Yönetici',
            'sales': 'Satış Temsilcisi',
            'driver': 'Şoför'
        };
        const roleLabel = roleLabels[user.role] || user.role || 'Kullanıcı';
        
        // Şube adı
        const branch = user.branchId ? branches.find(b => b.id === user.branchId) : null;
        const branchName = branch ? branch.name : '-';
        
        let html = `
            <div class="kullanici-detail-header">
                <button class="stok-back-btn" onclick="goBackToKullaniciList()" title="Geri Dön">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
            </div>
            <div class="kullanici-detail-grid">
                <div class="kullanici-detail-left">
                    <div class="kullanici-detail-section">
                        <div class="kullanici-detail-row">
                            <span class="kullanici-detail-label">Ad Soyad:</span>
                            <span class="kullanici-detail-value">${escapeHtml(user.name || '-')}</span>
                        </div>
                        <div class="kullanici-detail-row">
                            <span class="kullanici-detail-label">Şube:</span>
                            <span class="kullanici-detail-value">${escapeHtml(branchName)}</span>
                        </div>
                        <div class="kullanici-detail-row">
                            <span class="kullanici-detail-label">Telefon:</span>
                            <span class="kullanici-detail-value">${escapeHtml(user.phone || '-')}</span>
                        </div>
                        <div class="kullanici-detail-row">
                            <span class="kullanici-detail-label">E-posta:</span>
                            <span class="kullanici-detail-value">${escapeHtml(user.email || '-')}</span>
                        </div>
                        <div class="kullanici-detail-row">
                            <span class="kullanici-detail-label">Görev Tanımı:</span>
                            <span class="kullanici-detail-value">${escapeHtml(roleLabel)}</span>
                        </div>
                    </div>
                </div>
                <div class="kullanici-detail-right">
                    <div class="kullanici-detail-section">
                        <div class="kullanici-detail-section-title">Kullanıcı Hareketleri</div>
                        <div class="kullanici-events-list">
        `;
        
        if (userEvents.length === 0) {
            html += '<div style="text-align:center; padding:20px; color:#666;">Henüz hareket kaydı bulunmamaktadır.</div>';
        } else {
            userEvents.forEach(event => {
                const eventDate = event.date ? formatDateForDisplay(event.date) : '-';
                let eventText = '';
                let eventTypeLabel = '';
                
                if (event.type === 'kaza') {
                    eventTypeLabel = 'KAZA';
                    const d = event.data || {};
                    const surucu = d.surucu || event.surucu || '-';
                    const tutar = (d.hasarTutari || event.tutar) ? formatNumber(String(d.hasarTutari || event.tutar || '')) + ' TL' : '-';
                    const aciklama = d.aciklama ? ` | ${escapeHtml(d.aciklama)}` : '';
                    eventText = `Kullanıcı: ${escapeHtml(surucu)} | Hasar: ${escapeHtml(tutar)}${aciklama}`;
                } else if (event.type === 'bakim') {
                    eventTypeLabel = 'BAKIM';
                    const d = event.data || {};
                    const islemler = d.islemler || event.islemler || '-';
                    const tutar = (d.tutar || event.tutar) ? formatNumber(String(d.tutar || event.tutar || '')) + ' TL' : '-';
                    eventText = `${escapeHtml(islemler)} | Tutar: ${escapeHtml(tutar)}`;
                } else {
                    eventTypeLabel = event.type ? event.type.toUpperCase() : 'OLAY';
                    eventText = JSON.stringify(event);
                }
                
                html += `
                    <div class="kullanici-event-item">
                        <div class="kullanici-event-header">
                            <span class="kullanici-event-type">${escapeHtml(eventTypeLabel)}</span>
                            <span class="kullanici-event-date">${escapeHtml(eventDate)}</span>
                        </div>
                        <div class="kullanici-event-vehicle">${escapeHtml(event.vehiclePlate)} - ${escapeHtml(event.vehicleBrand)}</div>
                        <div class="kullanici-event-details">${escapeHtml(eventText)}</div>
                    </div>
                `;
            });
        }
        
        html += `
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        listContainer.innerHTML = html;
    };
    
    // Liste görünümüne dönüş
    window.goBackToKullaniciList = function() {
        kullaniciCurrentUserId = null;
        renderKullaniciList();
    };
    
    // Ana render fonksiyonu
    window.renderKullaniciView = function() {
        if (kullaniciCurrentBranchId === null) {
            renderKullaniciBranchGrid();
        } else {
            renderKullaniciList();
        }
    };
    
    // Tarih formatı helper (STOK sekmesinden kopyalandı)
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Sayı formatı helper
    function formatNumber(num) {
        if (!num || num === '-') return '-';
        const numStr = String(num).replace(/\./g, '');
        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // HTML Escape Helper
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Global Event Listeners (ESC ve Overlay click)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('reports-modal');
            if (modal && modal.classList.contains('active')) {
                closeReportsModal();
            }
        }
    });

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('reports-modal');
        if (modal && modal.classList.contains('active') && e.target === modal) {
            closeReportsModal();
        }
    });

})();
