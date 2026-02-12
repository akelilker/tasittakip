/* =========================================
   AYARLAR MODÜLÜ - ŞUBE & KULLANICI YÖNETİMİ
   ========================================= */

   (function () {
    const BRANCHES_KEY = "medisa_branches_v1";
    const USERS_KEY = "medisa_users_v1";
    const VEHICLES_KEY = "medisa_vehicles_v1";
  
    function $(sel, root = document) { return root.querySelector(sel); }
    function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  
    // ========================================
    // ŞUBE YÖNETİMİ
    // ========================================
  
    // — Storage —
    function readBranches() {
      try {
        const raw = localStorage.getItem(BRANCHES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
  
    function writeBranches(arr) {
      localStorage.setItem(BRANCHES_KEY, JSON.stringify(arr));
      
      // window.appData'yı güncelle ve sunucuya kaydet
      if (window.appData) {
        window.appData.branches = arr;
        // Sunucuya kaydet (async, hata durumunda sessizce devam et)
        if (window.saveDataToServer) {
          window.saveDataToServer().catch(err => {
            console.error('Sunucuya kaydetme hatası (sessiz):', err);
          });
        }
      }
    }
  
    function readVehicles() {
      try {
        const raw = localStorage.getItem(VEHICLES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
  
    // — Modal Kontrolü (Ana Liste) —
    window.openBranchManagement = function openBranchManagement() {
      const modal = document.getElementById('branch-modal');
      if (!modal) return;
  
      // Listeyi render et
      renderBranchList();
  
      // Modalı aç
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    };
  
    window.closeBranchManagement = function closeBranchManagement() {
      const modal = document.getElementById('branch-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
    };

    // — Modal Kontrolü (Form) —
    window.openBranchFormModal = function openBranchFormModal(editId = null) {
      const modal = document.getElementById('branch-form-modal');
      if (!modal) return;
  
      const form = $('#branch-form', modal);
      const idInput = $('#branch-id', modal);
      const nameInput = $('#branch-name', modal);
      const cityInput = $('#branch-city', modal);
      const title = $('.modal-header h2', modal);
      const deleteBtn = $('#branch-delete-btn', modal);
  
      // Form temizle
      if (form) form.reset();
      if (idInput) idInput.value = '';
  
      if (editId) {
        // DÜZENLEME MODU
        const branches = readBranches();
        const branch = branches.find(b => b.id === editId);
        if (branch) {
          if (idInput) idInput.value = branch.id;
          if (nameInput) nameInput.value = branch.name;
          if (cityInput) cityInput.value = branch.city || '';
          if (title) title.textContent = 'ŞUBE DÜZENLE';
        }
        // Sil butonunu göster
        if (deleteBtn) deleteBtn.style.display = 'flex';
      } else {
        // YENİ EKLEME MODU
        if (title) title.textContent = 'YENİ ŞUBE EKLE';
        // Sil butonunu gizle
        if (deleteBtn) deleteBtn.style.display = 'none';
      }
  
      // Modalı aç
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
  
      // Focus
      if (nameInput) {
        setTimeout(() => nameInput.focus(), 350);
      }
    };
  
    window.closeBranchFormModal = function closeBranchFormModal() {
      const modal = document.getElementById('branch-form-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
    };
  
    // — CRUD İşlemleri —
    /**
     * Şube kaydını formdan okuyup localStorage'a kaydeder (Create/Update)
     * 
     * Validasyon + Kaydetme akışı:
     * 1. Form alanlarını oku (id, name, city)
     * 2. Şube adı validasyonu yap (zorunlu alan)
     * 3. ID varsa güncelleme, yoksa yeni ekleme modu
     * 4. localStorage'a yaz
     * 5. Form modalını kapat ve ana listeyi güncelle
     * 6. Kullanıcıya başarı mesajı göster
     * 
     * @throws {Error} localStorage yazma hatası durumunda uygulama crash olabilir
     * (Hata yakalama henüz eklenmedi - rapor önerisi #6)
     */
    window.saveBranch = function saveBranch() {
      try {
        const modal = document.getElementById('branch-form-modal');
        if (!modal) return;
  
        const idInput = $('#branch-id', modal);
      const nameInput = $('#branch-name', modal);
      const cityInput = $('#branch-city', modal);
  
      const id = idInput ? idInput.value.trim() : '';
      const name = nameInput ? nameInput.value.trim() : '';
      const city = cityInput ? cityInput.value.trim() : '';
  
      // Validasyon
      if (!name) {
        alert('Şube Adı Giriniz.');
        if (nameInput) nameInput.focus();
        return;
      }
  
      const branches = readBranches();
  
      if (id) {
        // GÜNCELLEME
        const idx = branches.findIndex(b => b.id === id);
        if (idx !== -1) {
          branches[idx].name = name;
          branches[idx].city = city;
        }
      } else {
        // YENİ EKLEME
        const newBranch = {
          id: Date.now().toString(),
          name: name,
          city: city,
          createdAt: new Date().toISOString()
        };
        branches.push(newBranch);
      }
  
        writeBranches(branches);
  
        // Form modalını kapat
        closeBranchFormModal();
  
        // Ana modalı güncelle
        renderBranchList();
  
        alert(id ? 'Şube Güncellendi.' : 'Şube Eklendi.');
      } catch (error) {
        alert('Şube kaydı sırasında bir hata oluştu! Lütfen tekrar deneyin.');
      }
    };
  
    window.editBranch = function editBranch(id) {
      openBranchFormModal(id);
    };
  
    window.deleteBranch = function deleteBranch(id) {
      if (!id) return; // ID yoksa işlem yapma
      
      // Taşıt kontrolü
      const vehicles = readVehicles();
      const vehicleCount = vehicles.filter(v => v.branchId === id).length;
  
      // Kullanıcı kontrolü (şubeye atanmış kullanıcılar)
      const users = readUsers();
      const userCount = users.filter(u => u.branchId === id).length;
  
      if (vehicleCount > 0 || userCount > 0) {
        let msg = 'Şubeye İlişkin Kayıtlı Veri Bulunduğundan Silme Yapılamaz!\n\n';
        if (vehicleCount > 0) msg += `• ${vehicleCount} Adet Taşıt\n`;
        if (userCount > 0) msg += `• ${userCount} Adet Kullanıcı\n`;
        alert(msg);
        return;
      }
  
      if (!confirm('Bu Şubeyi Silmek İstediğinizden Emin Misiniz?')) return;
  
      const branches = readBranches();
      const filtered = branches.filter(b => b.id !== id);
      writeBranches(filtered);
      
      // Form modalını kapat
      closeBranchFormModal();
      
      // Ana modalı güncelle
      renderBranchList();
  
      alert('Şube Silindi.');
    };

    // — Liste Render —
    window.renderBranchList = function renderBranchList() {
      const container = document.getElementById('branch-list');
      if (!container) return;
  
      const branches = readBranches();
      const vehicles = readVehicles();
  
      if (branches.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:20px; color:var(--muted);">
            Henüz şube eklenmemiş.
          </div>
        `;
        return;
      }
  
      const rows = branches.map(branch => {
        const vehicleCount = vehicles.filter(v => v.branchId === branch.id).length;
        return `
          <div class="settings-card" onclick="editBranch('${branch.id}')" style="cursor:pointer;">
            <div class="settings-card-content">
              <div class="settings-card-title">${escapeHtml(branch.name)}</div>
              <div class="settings-card-subtitle">${escapeHtml(branch.city || '')}</div>
              <div class="settings-card-count">${vehicleCount} Taşıt</div>
            </div>
          </div>
        `;
      }).join('');
  
      container.innerHTML = rows;
    }
  
    // ========================================
    // KULLANICI YÖNETİMİ
    // ========================================
  
    // — Storage —
    function readUsers() {
      try {
        const raw = localStorage.getItem(USERS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        return arr.map(u => {
          // Sunucudan gelen isim -> name dönüşümü
          if (!u.name && u.isim) u.name = u.isim;
          if (!u.name && (u.firstName || u.lastName)) {
            u.name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
          }
          if (!u.name) u.name = '';
          // Diğer alan dönüşümleri
          if (!u.phone && u.telefon) u.phone = u.telefon;
          if (!u.branchId && u.sube_id) u.branchId = String(u.sube_id);
          if (!u.role && u.tip) {
            u.role = u.tip === 'admin' ? 'admin' : 'driver';
          }
          return u;
        });
      } catch {
        return [];
      }
    }
  
    function writeVehicles(arr) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(arr));
      if (window.appData) {
        window.appData.tasitlar = arr;
        if (window.saveDataToServer) {
          window.saveDataToServer().catch(err => {
            console.error('Sunucuya kaydetme hatası (sessiz):', err);
          });
        }
      }
    }
  
    /**
     * localStorage kullanıcı listesini appData.users formatına dönüştürüp senkron eder.
     * Portal (driver_login) ve raporlar tek kaynaktan (appData) okur.
     * zimmetli_araclar: driver_save.php için atanmış taşıt ID'leri (assignedUserId eşleşen taşıtlar)
     */
    function syncUsersToAppData(arr) {
      if (!window.appData) return;
      const list = arr != null ? arr : readUsers();
      const vehicles = readVehicles();
      window.appData.users = list.map(u => {
        const zimmetliAraclar = vehicles
          .filter(v => (v.assignedUserId != null && String(v.assignedUserId) === String(u.id)))
          .map(v => (typeof v.id === 'number' ? v.id : Number(v.id)) || v.id);
        return {
          id: u.id,
          isim: u.name || u.isim || '',
          kullanici_adi: u.kullanici_adi || '',
          sifre: u.sifre || '',
          telefon: u.phone || '',
          email: u.email || '',
          sube_id: u.branchId != null && u.branchId !== '' ? (isNaN(Number(u.branchId)) ? u.branchId : Number(u.branchId)) : undefined,
          tip: u.role === 'admin' ? 'admin' : (u.role === 'driver' ? 'surucu' : 'kullanici'),
          zimmetli_araclar: zimmetliAraclar,
          aktif: u.aktif !== false,
          kayit_tarihi: u.createdAt || new Date().toISOString(),
          son_giris: u.son_giris || null
        };
      });
      if (window.saveDataToServer) {
        window.saveDataToServer().catch(err => {
          console.error('Sunucuya kaydetme hatası (sessiz):', err);
        });
      }
    }
  
    function writeUsers(arr) {
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
      if (window.appData) {
        syncUsersToAppData(arr);
      }
    }
  
    // — Modal Kontrolü (Ana Liste) —
    window.openUserManagement = function openUserManagement() {
      const modal = document.getElementById('user-modal');
      if (!modal) return;
  
      // Listeyi render et
      renderUserList();
  
      // Modalı aç
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    };
  
    window.closeUserManagement = function closeUserManagement() {
      const modal = document.getElementById('user-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
    };
  
    // — Kullanıcı formu: Atanmış taşıtlar checkbox listesi doldur (arama + filtreleme) —
    function populateUserVehiclesMulti(searchFilter = '') {
      const container = document.getElementById('user-vehicles-container');
      if (!container) return;
      // Mevcut seçimleri koru (filtre değişince kaybolmasın)
      const assignedIds = Array.from(container.querySelectorAll('input[name=user-vehicle]:checked')).map(cb => cb.value);
      const vehicles = readVehicles();
      let activeVehicles = vehicles.filter(v => v.satildiMi !== true);
      const q = (searchFilter || '').trim().toLowerCase();
      if (q) {
        activeVehicles = activeVehicles.filter(v => {
          const plaka = (v.plate || v.plaka || '').toLowerCase();
          return plaka.includes(q);
        });
      }
      container.innerHTML = '';
      activeVehicles.forEach(v => {
        const vid = String(v.id);
        const plaka = v.plate || v.plaka || '';
        const markaModel = (v.brandModel || (v.brand || v.marka || '') + ' ' + (v.model || '')).trim();
        const label = plaka + (markaModel ? ' (' + markaModel + ')' : '');
        const labelEl = document.createElement('label');
        labelEl.style.display = 'block';
        labelEl.style.padding = '6px 8px';
        labelEl.style.cursor = 'pointer';
        labelEl.style.borderRadius = '4px';
        labelEl.style.marginBottom = '2px';
        labelEl.style.userSelect = 'none';
        labelEl.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.06)'; });
        labelEl.addEventListener('mouseleave', function() { this.style.background = 'transparent'; });
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = vid;
        cb.name = 'user-vehicle';
        cb.checked = assignedIds.indexOf(vid) !== -1;
        cb.style.marginRight = '8px';
        cb.style.verticalAlign = 'middle';
        labelEl.appendChild(cb);
        labelEl.appendChild(document.createTextNode(' ' + label));
        cb.addEventListener('change', updateUserVehiclesTriggerText);
        container.appendChild(labelEl);
      });
      updateUserVehiclesTriggerText();
    }
  
    window.handleUserVehiclesSearch = function(value) {
      populateUserVehiclesMulti(value);
    };
  
    function updateUserVehiclesTriggerText() {
      const trigger = document.getElementById('user-vehicles-trigger');
      const container = document.getElementById('user-vehicles-container');
      if (!trigger || !container) return;
      const checked = container.querySelectorAll('input[name=user-vehicle]:checked');
      const n = checked.length;
      trigger.textContent = n === 0 ? 'Taşıt Seçin' : (n === 1 ? '1 Taşıt Seçildi' : n + ' Taşıt Seçildi');
    }
  
    function toggleUserVehiclesDropdown() {
      const dropdown = document.getElementById('user-vehicles-dropdown');
      const trigger = document.getElementById('user-vehicles-trigger');
      if (!dropdown || !trigger) return;
      const isOpen = dropdown.style.display !== 'none';
      if (isOpen) {
        dropdown.style.display = 'none';
        trigger.classList.remove('user-vehicles-trigger-open');
      } else {
        dropdown.style.display = 'block';
        trigger.classList.add('user-vehicles-trigger-open');
      }
    }
  
    function closeUserVehiclesDropdown() {
      const dropdown = document.getElementById('user-vehicles-dropdown');
      const trigger = document.getElementById('user-vehicles-trigger');
      if (dropdown) dropdown.style.display = 'none';
      if (trigger) trigger.classList.remove('user-vehicles-trigger-open');
    }
  
    window.toggleUserVehiclesDropdown = toggleUserVehiclesDropdown;
  
    document.addEventListener('click', function(ev) {
      const wrap = document.querySelector('.user-vehicles-dropdown-wrap');
      const dropdown = document.getElementById('user-vehicles-dropdown');
      if (wrap && dropdown && dropdown.style.display !== 'none' && !wrap.contains(ev.target)) {
        closeUserVehiclesDropdown();
      }
    });
  
    // — Modal Kontrolü (Form) —
    window.openUserFormModal = function openUserFormModal(editId = null) {
      const modal = document.getElementById('user-form-modal');
      if (!modal) return;
  
      const form = $('#user-form', modal);
      const idInput = $('#user-id', modal);
      const nameInput = $('#user-name', modal);
      const branchSelect = $('#user-branch', modal);
      const phoneInput = $('#user-phone', modal);
      const emailInput = $('#user-email', modal);
      const roleSelect = $('#user-role', modal);
      const usernameInput = $('#user-username', modal);
      const passwordInput = $('#user-password', modal);
      const title = $('.modal-header h2', modal);
      const deleteBtn = $('#user-delete-btn', modal);
  
      // Şube dropdown'ını doldur
      populateBranchDropdown();
      // Atanacak taşıt dropdown'ını kapat, arama temizle ve listeyi doldur
      closeUserVehiclesDropdown();
      const searchInput = document.getElementById('user-vehicles-search');
      if (searchInput) searchInput.value = '';
      populateUserVehiclesMulti();
  
      // Şube select'e tıklanınca veya focus alındığında otomatik açılması için event listener ekle
      setTimeout(() => {
        const updatedBranchSelect = $('#user-branch', modal);
        if (updatedBranchSelect && !updatedBranchSelect.dataset.dropdownHandler) {
          updatedBranchSelect.dataset.dropdownHandler = 'true';
          
          // Focus event'i - Tab ile geldiğinde otomatik aç
          let isMouseClick = false;
          updatedBranchSelect.addEventListener('mousedown', function() {
            isMouseClick = true;
            setTimeout(() => { isMouseClick = false; }, 200);
          });
          
          updatedBranchSelect.addEventListener('focus', function(e) {
            // Eğer mouse ile tıklandıysa, zaten açılacak, bir şey yapma
            if (isMouseClick) return;
            
            // Klavye ile focus alındıysa (Tab ile), programatik click yap
            setTimeout(() => {
              // Select elementinin bounding box'ını al
              const rect = this.getBoundingClientRect();
              
              // Select elementinin sağ tarafına (dropdown okuna) tıklamış gibi yap
              const clickX = rect.right - 20; // Sağdan 20px içeri
              const clickY = rect.top + rect.height / 2; // Dikeyde ortada
              
              // Programatik mousedown event'i gönder
              const mouseDownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0,
                clientX: clickX,
                clientY: clickY
              });
              this.dispatchEvent(mouseDownEvent);
              
              // Mouseup event'i gönder
              setTimeout(() => {
                const mouseUpEvent = new MouseEvent('mouseup', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  button: 0,
                  clientX: clickX,
                  clientY: clickY
                });
                this.dispatchEvent(mouseUpEvent);
                
                // Click event'i gönder
                setTimeout(() => {
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0,
                    clientX: clickX,
                    clientY: clickY
                  });
                  this.dispatchEvent(clickEvent);
                }, 10);
              }, 10);
            }, 200);
          });
          
          // Click event'i - Fare ile tıklandığında da aç (zaten açılıyor ama garantilemek için)
          updatedBranchSelect.addEventListener('click', function(e) {
            // Native dropdown zaten açılacak, sadece focus ver
            if (document.activeElement !== this) {
              this.focus();
            }
          });
        }
      }, 100);
  
      // Form temizle
      if (form) form.reset();
      if (idInput) idInput.value = '';
  
      if (editId) {
        // DÜZENLEME MODU
        const users = readUsers();
        const user = users.find(u => u.id === editId);
        if (user) {
          if (idInput) idInput.value = user.id;
          if (nameInput) nameInput.value = user.name;
          const currentBranchSelect = $('#user-branch', modal);
          if (currentBranchSelect) currentBranchSelect.value = user.branchId || '';
          if (phoneInput) phoneInput.value = user.phone || '';
          if (emailInput) emailInput.value = user.email || '';
          if (roleSelect) roleSelect.value = user.role || 'driver';
          if (usernameInput) usernameInput.value = user.kullanici_adi || '';
          if (passwordInput) passwordInput.value = user.sifre || '';
          const vehiclesContainer = document.getElementById('user-vehicles-container');
          if (vehiclesContainer) {
            const vehicles = readVehicles();
            const assignedIds = vehicles.filter(v => v.assignedUserId === user.id).map(v => String(v.id));
            vehiclesContainer.querySelectorAll('input[name=user-vehicle]').forEach(cb => {
              cb.checked = assignedIds.indexOf(cb.value) !== -1;
            });
            updateUserVehiclesTriggerText();
          }
          if (title) title.textContent = 'KULLANICI DÜZENLE';
        }
        // Sil butonunu göster
        if (deleteBtn) deleteBtn.style.display = 'flex';
      } else {
        // YENİ EKLEME MODU
        if (title) title.textContent = 'YENİ KULLANICI EKLE';
        // Sil butonunu gizle
        if (deleteBtn) deleteBtn.style.display = 'none';
      }
  
      // Modalı aç
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
  
      // Focus
      if (nameInput) {
        setTimeout(() => nameInput.focus(), 350);
      }
    };
  
    window.closeUserFormModal = function closeUserFormModal() {
      const modal = document.getElementById('user-form-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
    };
  
    // — Şube Dropdown Doldur —
    function populateBranchDropdown() {
      const select = document.getElementById('user-branch');
      if (!select) return;
  
      const branches = readBranches();
  
      select.innerHTML = '<option value="">Şube Seçin</option>';
  
      branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        select.appendChild(option);
      });
    }
  
    // — CRUD İşlemleri —
    /**
     * Kullanıcı kaydını formdan okuyup localStorage'a kaydeder (Create/Update)
     * 
     * Validasyon + Kaydetme akışı:
     * 1. Form alanlarını oku (id, name, branchId, phone, email, role)
     * 2. Ad Soyad ve Şube validasyonu yap (zorunlu alanlar)
     * 3. ID varsa güncelleme, yoksa yeni ekleme modu
     * 4. localStorage'a yaz
     * 5. Form modalını kapat ve ana listeyi güncelle
     * 6. Kullanıcıya başarı mesajı göster
     * 
     * @throws {Error} localStorage yazma hatası durumunda uygulama crash olabilir
     * (Hata yakalama henüz eklenmedi - rapor önerisi #6)
     */
    function formatUserFullName(rawName) {
      const cleaned = (rawName || '').trim().replace(/\s+/g, ' ');
      if (!cleaned) return '';
      const parts = cleaned.split(' ');
      if (parts.length === 1) {
        const namePart = parts[0];
        const lower = namePart.toLocaleLowerCase('tr-TR');
        return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
      }
      const lastName = parts[parts.length - 1].toLocaleUpperCase('tr-TR');
      const firstParts = parts.slice(0, -1).map(p => {
        const lower = p.toLocaleLowerCase('tr-TR');
        return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
      });
      return `${firstParts.join(' ')} ${lastName}`;
    }
  
    window.saveUser = function saveUser() {
      try {
        const modal = document.getElementById('user-form-modal');
        if (!modal) {
          alert('Form modalı bulunamadı!');
          return;
        }
  
        const idInput = document.getElementById('user-id');
        const nameInput = document.getElementById('user-name');
        const branchSelect = document.getElementById('user-branch');
        const phoneInput = document.getElementById('user-phone');
        const emailInput = document.getElementById('user-email');
        const roleSelect = document.getElementById('user-role');
        const usernameInput = document.getElementById('user-username');
        const passwordInput = document.getElementById('user-password');
        const vehiclesContainer = document.getElementById('user-vehicles-container');
  
        if (!nameInput || !branchSelect) {
          alert('Form alanları bulunamadı!');
          return;
        }
  
        const id = idInput ? idInput.value.trim() : '';
        const nameRaw = nameInput.value.trim();
        const name = formatUserFullName(nameRaw);
        const branchId = branchSelect.value;
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const role = roleSelect ? roleSelect.value : 'driver';
        const kullanici_adi = usernameInput ? usernameInput.value.trim() : '';
        const sifre = passwordInput ? passwordInput.value : '';
        const selectedVehicleIds = vehiclesContainer
          ? Array.from(vehiclesContainer.querySelectorAll('input[name=user-vehicle]:checked')).map(cb => cb.value)
          : [];
  
        // Validasyon
        if (!name || !name.trim()) {
          alert('Ad Soyad giriniz.');
          nameInput.focus();
          return;
        }
        if (!branchId) {
          alert('Şube Seçiniz.');
          branchSelect.focus();
          return;
        }
  
        const users = readUsers();
        const vehicles = readVehicles();
        const hasAssignedVehicles = selectedVehicleIds.length > 0;
  
        // Şoför portal girişi: Taşıt atanmışsa Kullanıcı Adı ve Şifre zorunlu
        if (hasAssignedVehicles && (!kullanici_adi || !sifre)) {
          alert('Portal Girişi İçin Taşıt Atadığınız Kullanıcıların "Kullanıcı Adı (portal girişi)" ve "Şifre (portal girişi)" alanlarını doldurmanız gerekir. Kullanıcı bu bilgilerle driver sayfasında giriş yapacaktır.');
          if (usernameInput) usernameInput.focus();
          return;
        }
  
        let savedUserId = id;
        if (id) {
          // GÜNCELLEME
          const idx = users.findIndex(u => u.id === id);
          if (idx !== -1) {
            users[idx].name = name;
            users[idx].branchId = branchId;
            users[idx].phone = phone;
            users[idx].email = email;
            users[idx].role = role;
            users[idx].kullanici_adi = kullanici_adi;
            users[idx].sifre = sifre;
          }
        } else {
          // YENİ EKLEME
          const newUser = {
            id: 'u' + Date.now().toString(),
            name: name,
            branchId: branchId,
            phone: phone,
            email: email,
            role: role,
            kullanici_adi: kullanici_adi,
            sifre: sifre,
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          savedUserId = newUser.id;
        }
  
        // Atanmış taşıtlar: tek kaynak vehicle.assignedUserId
        vehicles.forEach(v => {
          const vid = String(v.id);
          const wasAssigned = v.assignedUserId === savedUserId;
          const nowSelected = selectedVehicleIds.indexOf(vid) !== -1;
          if (wasAssigned && !nowSelected) {
            v.assignedUserId = undefined;
            if (v.tahsisKisi !== undefined) v.tahsisKisi = '';
          } else if (nowSelected) {
            v.assignedUserId = savedUserId;
            const u = users.find(u => u.id === savedUserId);
            if (u && v.tahsisKisi !== undefined) v.tahsisKisi = u.name || '';
          }
        });
        writeVehicles(vehicles);
  
        writeUsers(users);
  
        // Form modalını kapat
        closeUserFormModal();
  
        // Ana modalı güncelle
        renderUserList();
  
        alert(id ? 'Kullanıcı Güncellendi.' : 'Kullanıcı Eklendi.');
  
        if (savedUserId) {
          window.dispatchEvent(new CustomEvent('userSaved', { detail: { id: savedUserId } }));
        }
      } catch (error) {
        console.error('Kullanıcı kayıt hatası:', error);
        alert('Kullanıcı kaydı sırasında bir hata oluştu! Lütfen tekrar deneyin.');
      }
    };
  
    window.editUser = function editUser(id) {
      openUserFormModal(id);
    };
  
    window.deleteUser = function deleteUser(id) {
      if (!id) return; // ID yoksa işlem yapma
      
      // Taşıt kontrolü
      const vehicles = readVehicles();
      const count = vehicles.filter(v => v.assignedUserId === id).length;
  
      if (count > 0) {
        alert(`Bu Kullanıcıya ${count} Adet Taşıt Tahsis Edilmiş. Önce Taşıtları Başka Kullanıcıya Aktarın.`);
        return;
      }
  
      if (!confirm('Bu Kullanıcıyı Silmek İstediğinizden Emin Misiniz?')) return;
  
      const users = readUsers();
      const filtered = users.filter(u => u.id !== id);
      writeUsers(filtered);
      
      // Form modalını kapat
      closeUserFormModal();
      
      // Ana modalı güncelle
      renderUserList();
  
      alert('Kullanıcı Silindi.');
    };

    // — Liste Render —
    window.renderUserList = function renderUserList() {
      const container = document.getElementById('user-list');
      if (!container) return;
  
      const users = readUsers();
      const branches = readBranches();
  
      if (users.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:20px; color:var(--muted);">
            Henüz kullanıcı eklenmemiş.
          </div>
        `;
        return;
      }
  
      const rows = users.map(user => {
        const branch = branches.find(b => b.id === user.branchId);
        const branchName = branch ? branch.name : '-';
        
        const roleLabels = {
          'admin': 'Yönetici',
          'sales': 'Satış Temsilcisi',
          'driver': 'Kullanıcı'
        };
        const roleLabel = roleLabels[user.role] || 'Kullanıcı';
        
        return `
          <div class="settings-card" onclick="editUser('${user.id}')" style="cursor:pointer;">
            <div class="settings-card-content">
              <div class="settings-card-title">${escapeHtml(user.name || 'İsimsiz')}</div>
              <div class="settings-card-subtitle">${escapeHtml(branchName)}</div>
              <div class="settings-card-gorev">${escapeHtml(roleLabel)}</div>
            </div>
          </div>
        `;
      }).join('');
  
      container.innerHTML = rows;
    }
  
    // ========================================
    // YARDIMCI FONKSİYONLAR
    // ========================================
  
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
    function formatDate(isoString) {
      if (!isoString) return '-';
      const date = new Date(isoString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  
    // ========================================
    // ESC & OVERLAY KAPAT
    // ========================================
  
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
  
      const branchModal = document.getElementById('branch-modal');
      const userModal = document.getElementById('user-modal');
      const branchFormModal = document.getElementById('branch-form-modal');
      const userFormModal = document.getElementById('user-form-modal');
      const dataModal = document.getElementById('data-management-modal');
  
      if (dataModal && dataModal.classList.contains('active')) {
        closeDataManagement();
      } else if (branchFormModal && branchFormModal.classList.contains('active')) {
        closeBranchFormModal();
      } else if (userFormModal && userFormModal.classList.contains('active')) {
        closeUserFormModal();
      } else if (branchModal && branchModal.classList.contains('active')) {
        closeBranchManagement();
      } else if (userModal && userModal.classList.contains('active')) {
        closeUserManagement();
      }
    });
  
    document.addEventListener('click', (e) => {
      const branchModal = document.getElementById('branch-modal');
      const userModal = document.getElementById('user-modal');
      const branchFormModal = document.getElementById('branch-form-modal');
      const userFormModal = document.getElementById('user-form-modal');
      const dataModal = document.getElementById('data-management-modal');
  
      if (branchModal && branchModal.classList.contains('active') && e.target === branchModal) {
        closeBranchManagement();
      }
      if (userModal && userModal.classList.contains('active') && e.target === userModal) {
        closeUserManagement();
      }
      if (branchFormModal && branchFormModal.classList.contains('active') && e.target === branchFormModal) {
        closeBranchFormModal();
      }
      if (userFormModal && userFormModal.classList.contains('active') && e.target === userFormModal) {
        closeUserFormModal();
      }
      if (dataModal && dataModal.classList.contains('active') && e.target === dataModal) {
        closeDataManagement();
      }
    });
  
    // ========================================
    // VERİ YÖNETİMİ
    // ========================================
  
    // — Modal Kontrolü —
    window.openDataManagement = function openDataManagement(event) {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
        event.preventDefault();
      }
  
      const settingsMenu = document.getElementById('settings-menu');
      if (settingsMenu) {
        settingsMenu.classList.remove('open');
      }
      const dataSubmenu = document.getElementById('data-submenu');
      if (dataSubmenu) {
        dataSubmenu.classList.remove('open');
      }
  
      const modal = document.getElementById('data-management-modal');
      if (!modal) return;
      if (modal.classList.contains('active') || modal.style.display === 'flex') {
        return;
      }
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    };
  
    window.closeDataManagement = function closeDataManagement() {
      const modal = document.getElementById('data-management-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
    };
  
    // — YEDEKLE (Export) —
    window.exportData = function exportData() {
      try {
        const branches = readBranches();
        const users = readUsers();
        const vehicles = readVehicles();
  
        const backup = {
          branches: branches,
          users: users,
          vehicles: vehicles,
          backup_date: new Date().toISOString(),
          version: "1.0"
        };
  
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `medisa_yedek_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
  
        alert('Yedek Başarıyla İndirildi!');
      } catch (error) {
        alert('Yedekleme sırasında hata oluştu!');
      }
    };
  
    // — YEDEKTEN GERİ YÜKLE (Import) —
    window.importData = function importData() {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.opacity = '0';
  
        input.onchange = function(e) {
          const file = e.target.files[0];
          if (!file) return;
  
          const reader = new FileReader();
          reader.onload = function(event) {
            try {
              const backup = JSON.parse(event.target.result);
  
              if (!backup.branches || !backup.users || !backup.vehicles) {
                alert('Geçersiz Yedek Dosyası!');
                return;
              }
  
              const message = `Yedek Tarih: ${new Date(backup.backup_date).toLocaleString('tr-TR')}\n\n` +
                            `Şubeler: ${backup.branches.length}\n` +
                            `Kullanıcılar: ${backup.users.length}\n` +
                            `Taşıtlar: ${backup.vehicles.length}\n\n` +
                            `Mevcut Veriler Silinecek! Emin Misiniz?`;
  
              if (!confirm(message)) return;
  
              writeBranches(backup.branches);
              writeUsers(backup.users);
              localStorage.setItem(VEHICLES_KEY, JSON.stringify(backup.vehicles));
  
              const existingApp = window.appData || {};
              const restoredBlob = {
                tasitlar: backup.vehicles,
                kayitlar: backup.kayitlar != null ? backup.kayitlar : (existingApp.kayitlar || []),
                branches: backup.branches,
                users: backup.users,
                ayarlar: backup.ayarlar || existingApp.ayarlar || { sirketAdi: 'Medisa', yetkiliKisi: '', telefon: '', eposta: '' },
                sifreler: backup.sifreler != null ? backup.sifreler : (existingApp.sifreler || [])
              };
              localStorage.setItem('medisa_data_v1', JSON.stringify(restoredBlob));
              sessionStorage.setItem('medisa_just_restored', '1');
  
              window.appData = restoredBlob;
  
              var doReload = function() {
                alert('Yedek Başarıyla Geri Yüklendi!\n\nSayfa Yenilenecek.');
                setTimeout(function() { window.location.reload(); }, 500);
              };
  
              if (typeof window.saveDataToServer === 'function') {
                var saveDone = false;
                var done = function() {
                  if (saveDone) return;
                  saveDone = true;
                  doReload();
                };
                window.saveDataToServer().then(done).catch(done);
                setTimeout(done, 8000);
              } else {
                doReload();
              }
            } catch (error) {
              alert('Yedek Dosyası Okunamadı!');
            }
          };
  
          reader.readAsText(file);
          if (input.parentNode) input.parentNode.removeChild(input);
        };
  
        document.body.appendChild(input);
        input.click();
        setTimeout(function() {
          if (input.parentNode) input.parentNode.removeChild(input);
        }, 30000);
      } catch (err) {
        alert('Dosya seçici açılamadı. Lütfen tekrar deneyin.');
      }
    };
  
    // — SUNUCUYA YÜKLE (Simülasyon - Backend gelene kadar) —
    async function uploadToServer() {
      try {
        const branches = readBranches();
        const users = readUsers();
        const vehicles = readVehicles();
  
        const backup = {
          branches: branches,
          users: users,
          vehicles: vehicles,
          upload_date: new Date().toISOString()
        };
  
        // Backend gelene kadar localStorage'a kaydediyoruz
        localStorage.setItem('medisa_server_backup', JSON.stringify(backup));
        
        // Simüle: 80% başarı, 20% hata
        const success = Math.random() > 0.2;
        
        if (success) {
          return { success: true, message: 'Veriler sunucuya yüklendi.' };
        } else {
          return { success: false, message: 'Sunucu bağlantı hatası!' };
        }
  
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  
    // — ÖNBELLEK TEMİZLE —
    /**
     * Tarayıcı önbelleğini (cache) temizler
     * 
     * İşlem akışı:
     * 1. Kullanıcıya onay modal'ı göster (cache-confirm-modal)
     * 2. Onaylandığında confirmCacheClear() fonksiyonu çağrılır
     * 3. confirmCacheClear içinde:
     *    - Tüm localStorage verileri silinir (vehicles, branches, users)
     *    - Sayfa yenilenir (temiz başlangıç)
     * 
     * Not: Bu işlem geri alınamaz! Tüm veriler silinir.
     * 
     * @async
     * @throws {Error} Modal açma hatası durumunda info modal gösterilir
     */
    window.clearCache = async function clearCache() {
      try {
        // Modal ile kullanıcıya sor (sunucuya yükleme onaydan SONRA yapılacak)
        const confirmMessage = 'Tarayıcı Belleği Temizlenecektir, Devam Etmek İstediğinize Emin Misiniz?';
        window.openCacheConfirmModal(confirmMessage);
   
      } catch (error) {
        window.showInfoModal('Bir Hata Oluştu!');
      }
    };
  
    // — ÖNBELLEK TEMİZLEME ONAY MODALI —
    let cacheClearConfirmed = false;
  
    window.openCacheConfirmModal = function openCacheConfirmModal(message) {
      const modal = document.getElementById('cache-confirm-modal');
      const messageEl = document.getElementById('cache-confirm-message');
      if (!modal || !messageEl) return;

      // Mesajı formatla (satır sonlarını <br> ile değiştir)
      messageEl.innerHTML = message.replace(/\n/g, '<br>');
      cacheClearConfirmed = false;
  
      // Body'ye modal-open class'ı ekle
      document.body.classList.add('modal-open');
  
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    };
  
    window.closeCacheConfirmModal = function closeCacheConfirmModal() {
      const modal = document.getElementById('cache-confirm-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        // Body'den modal-open class'ını kaldır
        document.body.classList.remove('modal-open');
        if (!cacheClearConfirmed) {
          // İptal edildi, bir şey yapma
        }
      }, 300);
    };
  
    window.confirmCacheClear = async function confirmCacheClear() {
      cacheClearConfirmed = true;
      closeCacheConfirmModal();
  
      try {
        // 1. ÖNCE SUNUCUYA YEDEKLEME YAP (ilerisi için hazır)
        window.showInfoModal('Veriler Sunucuya Yedekleniyor...');
        const result = await uploadToServer();
  
        if (!result.success) {
          // Sunucuya yükleme başarısız - kullanıcıya sor
          const retryMessage = 'Veriler Sunucuya Yüklenemedi!\n\nYine De Temizlemek İstiyor Musunuz?';
          window.openCacheConfirmModal(retryMessage);
          return;
        }
  
        // 2. SUNUCUYA YÜKLEME BAŞARILI - ŞİMDİ TEMİZLE
        localStorage.clear();
        
        window.showInfoModal('Veriler Sunucuya Yedeklendi Ve Tarayıcı Belleği Temizlendi!\n\nSayfa Yenilenecek.');
        
        // 3. Sayfayı yenile
        setTimeout(() => {
          window.location.reload();
        }, 2000);
  
      } catch (error) {
        window.showInfoModal('Bir Hata Oluştu!');
      }
    };
  
    // — BİLGİ MODALI (Alert yerine) —
    window.showInfoModal = function showInfoModal(message) {
      const modal = document.getElementById('info-modal');
      const messageEl = document.getElementById('info-message');
      if (!modal || !messageEl) return;

      // Mesajı formatla (satır sonlarını <br> ile değiştir)
      messageEl.innerHTML = message.replace(/\n/g, '<br>');
  
      // Body'ye modal-open class'ı ekle
      document.body.classList.add('modal-open');
  
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    };
  
    window.closeInfoModal = function closeInfoModal() {
      const modal = document.getElementById('info-modal');
      if (!modal) return;
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        // Body'den modal-open class'ını kaldır
        document.body.classList.remove('modal-open');
      }, 300);
    };
  
    // ========================================
    // EXPORT STORAGE ACCESS
    // ========================================
  
    window.__medisaBranchesStorage = {
      key: BRANCHES_KEY,
      read: readBranches,
      write: writeBranches
    };
  
    window.__medisaUsersStorage = {
      key: USERS_KEY,
      read: readUsers,
      write: writeUsers
    };
  })();