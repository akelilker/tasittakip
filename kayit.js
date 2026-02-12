/* =========================================
   TAŞIT KAYIT MODÜLÜ
   ========================================= */

(function () {
  const STORAGE_KEY = "medisa_vehicles_v1";
  const BRANCHES_KEY = "medisa_branches_v1";

  let isEditMode = false;
  let editingVehicleId = null;

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function getModal() { return document.getElementById("vehicle-modal"); }

  // --- Data Reading ---
  function readBranches() {
    try {
      const raw = localStorage.getItem(BRANCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function readVehicles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function writeVehicles(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }


  // --- Helper Functions ---
  /**
   * Sayısal değerleri binlik ayırıcı (.) ile formatlar
   * 
   * @param {string} value - Formatlanacak metin (örn: "150000" veya "150000 TL")
   * @returns {string} - Formatlanmış metin (örn: "150.000") veya boş string
   * 
   * Örnek:
   * formatNumberWithSeparator("150000") -> "150.000"
   * formatNumberWithSeparator("150000 TL") -> "150.000"
   * formatNumberWithSeparator("abc") -> ""
   */
  function formatNumberWithSeparator(value) {
    // Sayıları binlik ayırıcı ile formatla
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // --- Tramer Kayıt Fonksiyonları ---
  /**
   * Tarih string'ini formatlar (020225 → 02/02/2025)
   * 
   * @param {string} value - Formatlanacak tarih (örn: "020225" veya "02/02/2025")
   * @returns {string} - Formatlanmış tarih (örn: "02/02/2025") veya boş string
   */
  /**
   * Tarihi gg/aa/yyyy formatına çevirir (gösterim için)
   * 
   * @param {Date} date - Tarih objesi
   * @returns {string} - gg/aa/yyyy formatında tarih string'i
   */
  function formatDateForDisplay(date) {
    if (!date) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  /**
   * gg/aa/yyyy formatındaki string'i parse eder
   * 
   * @param {string} dateStr - gg/aa/yyyy formatında tarih string'i
   * @returns {Date|null} - Parse edilmiş Date objesi veya null
   */
  function parseDateInput(dateStr) {
    if (!dateStr) return null;
    
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    
    const date = new Date(year, month, day);
    
    // Tarih geçerliliği kontrolü
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  }

  /**
   * gg/aa/yyyy formatını validate eder
   * 
   * @param {string} dateStr - Validasyon yapılacak tarih (gg/aa/yyyy formatında)
   * @returns {{valid: boolean, message: string}} - Validasyon sonucu
   */
  function validateDateInput(dateStr) {
    if (!dateStr) {
      return { valid: false, message: 'Tarih boş olamaz!' };
    }
    
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) {
      return { valid: false, message: 'Geçersiz tarih formatı! (gg/aa/yyyy)' };
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Tarih geçerliliği kontrolü
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return { valid: false, message: 'Geçersiz tarih!' };
    }
    
    return { valid: true, message: '' };
  }

  function formatTramerDate(value) {
    if (!value) return '';
    
    // Zaten formatlı ise (02/02/2025) olduğu gibi bırak
    if (value.includes('/')) {
      return value;
    }
    
    // Sadece rakamlardan oluşuyorsa formatla
    const numericValue = value.replace(/[^\d]/g, '');
    
    // 6 haneli ise (020225) → gg/aa/yyyy formatına çevir
    if (numericValue.length === 6) {
      const day = numericValue.substring(0, 2);
      const month = numericValue.substring(2, 4);
      const year = '20' + numericValue.substring(4, 6);
      return `${day}/${month}/${year}`;
    }
    
    // Geçersiz format
    return '';
  }

  /**
   * Tramer tarihini validasyon yapar (bugünden ileriye yasak)
   * 
   * @param {string} dateStr - Validasyon yapılacak tarih (gg/aa/yyyy formatında)
   * @returns {{valid: boolean, message: string}} - Validasyon sonucu
   */
  function validateTramerDate(dateStr) {
    if (!dateStr) {
      return { valid: true, message: '' }; // Boş tarih geçerli (opsiyonel)
    }
    
    // Format kontrolü (gg/aa/yyyy)
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) {
      return { valid: false, message: 'Geçersiz tarih formatı! (gg/aa/yyyy)' };
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Tarih geçerliliği kontrolü
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return { valid: false, message: 'Geçersiz tarih!' };
    }
    
    // Bugünden ileriye kontrolü
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date > today) {
      return { valid: false, message: 'Gelecek bir tarih girilemez!' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Tramer tutarını formatlar (2000 → 2.000,00TL)
   * 
   * @param {string} value - Formatlanacak tutar (örn: "2000" veya "2000,00")
   * @returns {string} - Formatlanmış tutar (örn: "2.000,00TL")
   */
  function formatTramerAmount(value) {
    if (!value) return '';
    
    // TL ve noktalardan temizle
    let numericValue = value.replace(/TL/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    
    // Sadece rakam ve nokta bırak
    numericValue = numericValue.replace(/[^\d.]/g, '');
    
    if (!numericValue) return '';
    
    // Ondalık kısmı ayır
    const parts = numericValue.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] ? parts[1].substring(0, 2).padEnd(2, '0') : '00';
    
    // Binlik ayırıcı ekle
    const integerFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${integerFormatted},${decimalPart}TL`;
  }

  /**
   * Tramer kayıt satırı ekler
   * 
   * @param {string} [date=''] - Tarih değeri (opsiyonel)
   * @param {string} [amount=''] - Tutar değeri (opsiyonel)
   */
  function addTramerRecordRow(date = '', amount = '') {
    const container = document.getElementById('tramer-records-container');
    if (!container) return;
    
    const rowId = `tramer-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const isFirstRow = container.children.length === 0;
    
    const row = document.createElement('div');
    row.className = 'tramer-record-row';
    row.id = rowId;
    
    // Tarih input
    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.className = 'form-input tramer-date-input';
    dateInput.placeholder = 'gg/aa/yyyy';
    dateInput.value = date;
    dateInput.maxLength = 10;
    dateInput.setAttribute('inputmode', 'numeric');
    
    // Tarih input event'leri
    dateInput.addEventListener('input', function(e) {
      const cursorPos = this.selectionStart;
      const inputValue = this.value.replace(/[^\d]/g, '');
      
      // 6 haneli sayı ise otomatik formatla
      if (inputValue.length === 6) {
        const formatted = formatTramerDate(inputValue);
        this.value = formatted;
        this.setSelectionRange(this.value.length, this.value.length);
      } else if (inputValue.length > 6) {
        // 6 haneden fazla ise ilk 6 hanesini al ve formatla
        const formatted = formatTramerDate(inputValue.substring(0, 6));
        this.value = formatted;
        this.setSelectionRange(this.value.length, this.value.length);
      }
      
      // Tarih validasyonu
      if (this.value.length === 10) {
        const validation = validateTramerDate(this.value);
        if (!validation.valid) {
          this.classList.add('field-error');
          // Alert yerine title attribute ile göster (daha az rahatsız edici)
          this.title = validation.message;
        } else {
          this.classList.remove('field-error');
          this.title = '';
        }
      }
    });
    
    dateInput.addEventListener('blur', function() {
      if (this.value && this.value.length < 10) {
        // Eksik format varsa düzeltmeyi dene
        const formatted = formatTramerDate(this.value);
        if (formatted) {
          this.value = formatted;
        }
      }
    });
    
    // Tutar input
    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.className = 'form-input tramer-amount-input';
    amountInput.placeholder = '2.000,00TL';
    amountInput.value = amount;
    amountInput.setAttribute('inputmode', 'numeric');
    
    // Tutar input event'leri
    amountInput.addEventListener('blur', function() {
      if (this.value) {
        const formatted = formatTramerAmount(this.value);
        this.value = formatted;
      }
    });
    
    // Buton (+ veya X)
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isFirstRow ? 'tramer-add-btn' : 'tramer-remove-btn';
    button.innerHTML = isFirstRow ? '+' : '×';
    button.title = isFirstRow ? 'Yeni satır ekle' : 'Satırı sil';
    
    if (isFirstRow) {
      button.addEventListener('click', function() {
        addTramerRecordRow();
      });
    } else {
      button.addEventListener('click', function() {
        removeTramerRecordRow(this);
      });
    }
    
    row.appendChild(dateInput);
    row.appendChild(amountInput);
    row.appendChild(button);
    container.appendChild(row);
  }

  /**
   * Tramer kayıt satırını siler
   * 
   * @param {HTMLElement} buttonElement - Silme butonu elementi
   */
  function removeTramerRecordRow(buttonElement) {
    const row = buttonElement.closest('.tramer-record-row');
    if (row) {
      row.remove();
      
      // İlk satırda + butonu olması gerekiyor
      const container = document.getElementById('tramer-records-container');
      if (container && container.children.length > 0) {
        const firstRow = container.children[0];
        const firstButton = firstRow.querySelector('button');
        if (firstButton && !firstButton.classList.contains('tramer-add-btn')) {
          firstButton.className = 'tramer-add-btn';
          firstButton.innerHTML = '+';
          firstButton.title = 'Yeni satır ekle';
          firstButton.onclick = function() {
            addTramerRecordRow();
          };
        }
      }
    }
  }

  /**
   * Tüm tramer kayıtlarını toplar
   * 
   * @returns {Array<{date: string, amount: string}>} - Tramer kayıtları array'i
   */
  function getTramerRecords() {
    const container = document.getElementById('tramer-records-container');
    if (!container) return [];
    
    const records = [];
    const rows = container.querySelectorAll('.tramer-record-row');
    
    rows.forEach(row => {
      const dateInput = row.querySelector('.tramer-date-input');
      const amountInput = row.querySelector('.tramer-amount-input');
      
      const date = dateInput ? dateInput.value.trim() : '';
      const amount = amountInput ? amountInput.value.trim() : '';
      
      // Sadece hem tarih hem tutar dolu olan kayıtları ekle
      if (date && amount) {
        records.push({
          date: date,
          amount: amount
        });
      }
    });
    
    return records;
  }

  /**
   * Tramer kayıtlarını yükler (edit modu için)
   * 
   * @param {Array<{date: string, amount: string}>} records - Yüklenecek kayıtlar
   */
  function loadTramerRecords(records) {
    const container = document.getElementById('tramer-records-container');
    if (!container) return;
    
    // Container'ı temizle
    container.innerHTML = '';
    
    if (records && records.length > 0) {
      records.forEach(record => {
        addTramerRecordRow(record.date || '', record.amount || '');
      });
    } else {
      // Boşsa ilk satırı ekle
      addTramerRecordRow();
    }
  }

  /**
   * Boya parçaları SVG'sini yükler ve tıklama event'lerini ekler
   */
  function initBoyaPartsSVG() {
    const container = document.getElementById('boya-parts-container');
    if (!container) return;
    
    // SVG zaten yüklüyse tekrar yükleme
    if (container.querySelector('svg')) return;
    
    // SVG içeriğini fetch ile yükle
    fetch('icon/kaporta.svg')
      .then(response => response.text())
      .then(svgText => {
        // SVG'yi container'a ekle
        container.innerHTML = svgText;
        
        // Her parça path'ine tıklama event'i ekle
        const svg = container.querySelector('svg');
        if (svg) {
          // Tüm path elementlerini bul (g içinde olsa bile)
          const parts = svg.querySelectorAll('path[id]');
          parts.forEach(part => {
            const partId = part.getAttribute('id');
            if (partId && partId !== 'araba-govde') {
              part.classList.add('car-part');
              part.style.cursor = 'pointer';
              part.style.transition = 'fill 0.2s ease';
              
              // Varsayılan gri rengini hafif griye güncelle (#c0c0c0 → #888888)
              const currentFill = part.getAttribute('fill') || part.style.fill || '#c0c0c0';
              if (currentFill === '#c0c0c0' || !part.getAttribute('fill')) {
                part.setAttribute('fill', '#888888');
              }
              
              // Varsayılan durumu boyasız olarak ayarla
              part.dataset.state = 'boyasiz';
              
              part.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handlePartClick(partId);
              });
            }
          });
        }
        
        // Renk açıklamalarını (legend) ekle
        const legend = document.createElement('div');
        legend.className = 'boya-legend';
        legend.innerHTML = `
          <div class="boya-legend-item">
            <span class="boya-legend-dot boyasiz"></span>
            <span>Boyasız</span>
          </div>
          <div class="boya-legend-item">
            <span class="boya-legend-dot boyali"></span>
            <span>Boyalı</span>
          </div>
          <div class="boya-legend-item">
            <span class="boya-legend-dot degisen"></span>
            <span>Değişen</span>
          </div>
        `;
        container.appendChild(legend);
      })
      .catch(error => {
        console.error('SVG yükleme hatası:', error);
      });
  }

  /**
   * Parça tıklamasında durumu değiştirir (boyasız → boyalı → değişen → boyasız)
   * 
   * @param {string} partId - Parça ID'si (örn: "on-tampon", "kaput")
   */
  function handlePartClick(partId) {
    // SVG içindeki elementler için querySelector kullan
    const container = document.getElementById('boya-parts-container');
    if (!container) return;
    
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const part = svg.querySelector(`#${partId}`) || document.getElementById(partId);
    if (!part) {
      console.warn('Parça bulunamadı:', partId);
      return;
    }
    
    const currentState = part.dataset.state || 'boyasiz';
    
    // Durum döngüsü: boyasız → boyalı → değişen → boyasız
    let nextState;
    if (currentState === 'boyasiz') {
      nextState = 'boyali';
    } else if (currentState === 'boyali') {
      nextState = 'degisen';
    } else {
      nextState = 'boyasiz';
    }
    
    // Parça durumunu ve rengini güncelle
    updatePartColor(partId, nextState);
  }

  /**
   * Parça rengini durumuna göre günceller
   * 
   * @param {string} partId - Parça ID'si
   * @param {string} state - Durum: "boyasiz" (gri), "boyali" (yeşil), "degisen" (kırmızı)
   */
  function updatePartColor(partId, state) {
    // SVG içindeki elementler için querySelector kullan
    const container = document.getElementById('boya-parts-container');
    if (!container) return;
    
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const part = svg.querySelector(`#${partId}`) || document.getElementById(partId);
    if (!part) {
      console.warn('Parça bulunamadı (updatePartColor):', partId);
      return;
    }
    
    // Durumu dataset'e kaydet
    part.dataset.state = state;
    
    // Renk belirle
    let color;
    if (state === 'boyali') {
      color = '#4ade80'; // Yeşil
    } else if (state === 'degisen') {
      color = '#e1061b'; // Kırmızı
    } else {
      color = '#888888'; // Hafif gri (boyasız)
    }
    
    // Rengi güncelle (hem attribute hem style)
    part.setAttribute('fill', color);
    part.style.fill = color;
  }

  /**
   * Tüm parça durumlarını object olarak döndürür
   * 
   * @returns {Object} - Parça ID'leri ve durumları (örn: { "on-tampon": "boyali", "kaput": "degisen" })
   */
  function getBoyaPartsState() {
    const container = document.getElementById('boya-parts-container');
    if (!container) return {};
    
    const svg = container.querySelector('svg');
    if (!svg) return {};
    
    const state = {};
    const parts = svg.querySelectorAll('path[id]');
    
    parts.forEach(part => {
      const partId = part.getAttribute('id');
      if (partId && partId !== 'araba-govde') {
        const partState = part.dataset.state;
        // Sadece "boyali" veya "degisen" durumlarındaki parçaları kaydet
        if (partState === 'boyali' || partState === 'degisen') {
          state[partId] = partState;
        }
      }
    });
    
    return state;
  }

  /**
   * Kaydedilmiş parça durumlarını SVG'ye yükler
   * 
   * @param {Object} stateObject - Parça ID'leri ve durumları object'i
   */
  function loadBoyaPartsState(stateObject) {
    if (!stateObject || typeof stateObject !== 'object') return;
    
    // Her parça için durumu yükle
    Object.keys(stateObject).forEach(partId => {
      const state = stateObject[partId];
      if (state === 'boyali' || state === 'degisen') {
        updatePartColor(partId, state);
      }
    });
  }

  function capitalizeFirstLetter(text) {
    // Her kelimenin ilk harfini büyük yap
    return text.split(' ').map(word => 
      word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
    ).join(' ');
  }

  // --- UI Helpers ---
  function updateModalTitle(title) {
    const modal = getModal();
    const titleElement = $(".modal-header h2", modal);
    if (titleElement) titleElement.textContent = title;
  }

  /**
   * Şube dropdown listesini localStorage'dan okunan şubelerle doldurur
   * 
   * @param {string} [selectedId=""] - Seçili olarak gösterilecek şube ID'si (opsiyonel)
   * 
   * Mantık:
   * 1. "vehicle-branch-select" elementi bulunur
   * 2. İlk option "Seçiniz" olarak eklenir
   * 3. localStorage'dan şubeler okunur
   * 4. Şube yoksa "Önce Şube Ekleyiniz" mesajı gösterilir
   * 5. Şubeler varsa alfabetik sırayla option olarak eklenir
   * 6. selectedId parametresi varsa o şube seçili olur
   */
  function populateBranchSelect(selectedId = "") {
    try {
      const select = document.getElementById("vehicle-branch-select");
      if (!select) return;

      const branches = readBranches();
    
    // İlk option'ı oluştur
    const firstOpt = document.createElement("option");
    firstOpt.value = "";
    firstOpt.textContent = "Seçiniz";
    firstOpt.style.backgroundColor = "#0b0f12";
    firstOpt.style.color = "#e0e0e0";
      select.innerHTML = "";
      select.appendChild(firstOpt);

      if (branches.length === 0) {
          const opt = document.createElement("option");
          opt.disabled = true;
          opt.text = "Önce Şube Ekleyiniz";
          opt.style.backgroundColor = "#0b0f12";
          opt.style.color = "#e0e0e0";
          select.add(opt);
          return;
      }

      branches.forEach(b => {
          const opt = document.createElement("option");
          opt.value = b.id;
          opt.textContent = b.name;
          opt.style.backgroundColor = "#0b0f12";
          opt.style.color = "#e0e0e0";
          if (b.id === selectedId) opt.selected = true;
          select.appendChild(opt);
      });
      
      // Select'in kendisine de stil ekle
      select.style.backgroundColor = "transparent";
    } catch (error) {
      // Hata durumunda sessizce çık, dropdown boş kalabilir
    }
  }

  function resetVehicleForm() {
    const modal = getModal();
    if (!modal) return;

    // Reset Inputs (tarih input'ları hariç - onları ayrı ayarlayacağız)
    $all('input.form-input, textarea.form-input', modal).forEach(input => {
      // Tarih input'larını şimdilik atla
      if (input.type === 'date') return;
      
      input.value = '';
      input.classList.remove('has-value');
      
      if (input.id === 'vehicle-notes') {
          input.style.height = '22px';
      }
    });

    // Sigorta ve Kasko bitiş tarihlerini bugün + 1 yıl olarak ayarla
    const dateInputs = $all('input[type="date"].form-input', modal);
    if (dateInputs.length >= 2) {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);
      
      // Tarihi YYYY-MM-DD formatına çevir
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Sigorta Bitiş Tarihi (index 0) - bugün + 1 yıl
      if (dateInputs[0]) {
        dateInputs[0].value = formatDate(nextYear);
        dateInputs[0].classList.add('has-value'); // Stil için
        dateInputs[0].style.color = '#888'; // Görünür olması için
      }
      
      // Kasko Bitiş Tarihi (index 1) boş kalacak
      if (dateInputs[1]) {
        dateInputs[1].value = '';
        dateInputs[1].classList.remove('has-value'); // Stil için
        dateInputs[1].style.color = 'transparent'; // Placeholder görünmesi için
      }
      
      // Muayene Bitiş Tarihi (index 2) boş kalacak
      if (dateInputs[2]) {
        dateInputs[2].value = '';
        dateInputs[2].classList.remove('has-value'); // Stil için
        dateInputs[2].style.color = 'transparent'; // Placeholder görünmesi için
      }
    }

    // Reset Selects & Buttons
    const branchSelect = document.getElementById("vehicle-branch-select");
    if (branchSelect) branchSelect.value = '';
    
    $all(".vehicle-type-btn", modal).forEach(btn => btn.classList.remove("active"));
    $all(".radio-btn", modal).forEach(btn => btn.classList.remove("active", "green"));

    // Hide Conditional Fields
    const tramerContainer = document.getElementById('tramer-records-container');
    if (tramerContainer) {
      tramerContainer.style.display = 'none';
      tramerContainer.innerHTML = ''; // Tüm satırları temizle
    }
    const boyaContainer = document.getElementById('boya-parts-container');
    if (boyaContainer) {
      boyaContainer.style.display = 'none';
      boyaContainer.innerHTML = ''; // SVG'yi temizle
    }
    ["anahtar-nerede", "kredi-detay"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    updateModalTitle("TAŞIT KAYIT İŞLEMLERİ");
    populateBranchSelect();
  }

  // --- Date Placeholder Helper ---
  /**
   * Tarih input'larına özel placeholder ekler (iOS uyumlu)
   * 
   * @param {HTMLInputElement} input - Tarih input elementi (type="date")
   * 
   * Mantık:
   * 1. Eski placeholder'ı temizle (varsa)
   * 2. Mobil/Desktop kontrolü yap (left değeri farklı)
   * 3. Input'un padding ve height değerlerini hesapla
   * 4. Input pozisyonunu parent'a göre hesapla
   * 5. Yeni placeholder span oluştur ve parent'a ekle
   * 6. Focus/blur event'lerini dinle (placeholder görünürlüğü için)
   * 
   * Not: 
   * - Mobil (<640px): left="4px", Desktop: left="8px"
   * - Input değeri varsa veya focus'ta placeholder gizlenir
   * - iOS Safari'de date input placeholder'ı göstermek için gerekli
   */
  window.setupDatePlaceholder = function setupDatePlaceholder(input) {
    // Eğer placeholder zaten varsa, kaldır
    const existing = input.parentElement.querySelector('.date-placeholder');
    if (existing) existing.remove();
    
    // Mobil kontrolü
    const isMobile = window.innerWidth <= 640;
    const leftValue = isMobile ? '4px' : '8px';
    
    // Input'un padding ve height değerlerini al
    const inputStyle = window.getComputedStyle(input);
    const paddingTop = parseFloat(inputStyle.paddingTop) || 4;
    const paddingBottom = parseFloat(inputStyle.paddingBottom) || 4;
    const inputHeight = parseFloat(inputStyle.height) || 22;
    const lineHeight = parseFloat(inputStyle.lineHeight) || parseFloat(inputStyle.fontSize) * 1.2;
    
    // Placeholder'ın line-height'ını da hesapla
    const placeholderLineHeight = parseFloat(inputStyle.fontSize) * 1.2;
    
    // Input'un pozisyonunu al (parent'a göre)
    const inputRect = input.getBoundingClientRect();
    const parentRect = input.parentElement.getBoundingClientRect();
    const inputOffsetTop = inputRect.top - parentRect.top;
    
    // Input'un içindeki metin alanının ortasını bul
    const contentHeight = inputHeight - paddingTop - paddingBottom;
    const contentCenter = inputOffsetTop + paddingTop + (contentHeight / 2);
    
    // Placeholder'ın top değerini, placeholder'ın ortası contentCenter'a denk gelecek şekilde ayarla
    // Biraz daha aşağı kaydırmak için +1px offset ekle
    const topValue = contentCenter - (placeholderLineHeight / 2) + 1;
    
    // Placeholder span oluştur
    const placeholder = document.createElement('span');
    placeholder.className = 'date-placeholder';
    placeholder.textContent = input.placeholder || 'gg.aa.yyyy';
    placeholder.style.cssText = `position: absolute; left: ${leftValue}; top: ${topValue}px; color: #666 !important; pointer-events: none; font-size: 10px; z-index: 100; line-height: ${lineHeight}px;`;
    
    // Input'un parent'ına ekle (input'un içinde görünmesi için)
    const parent = input.parentElement;
    if (parent) {
      // Parent'ı relative yap ve input'un padding'i ile uyumlu olmasını sağla
      parent.style.position = 'relative';
      parent.appendChild(placeholder);
    }
    
    // Placeholder görünürlüğünü kontrol et
    function updatePlaceholder() {
      if (input.value || input === document.activeElement) {
        placeholder.style.display = 'none';
      } else {
        placeholder.style.display = 'block';
      }
    }
    
      // Event listener'lar
      input.addEventListener('change', () => {
        const hasValue = !!input.value;
        input.classList.toggle('has-value', hasValue);
        // Değer girildiğinde input rengini görünür yap
        if (hasValue) {
          input.style.color = '#888';
        } else {
          input.style.color = 'transparent';
        }
        updatePlaceholder();
      });
      
      input.addEventListener('focus', () => {
        placeholder.style.display = 'none';
        input.style.color = '#888'; // Focus olduğunda görünür
      });
      
      input.addEventListener('blur', () => {
        if (!input.value) {
          input.style.color = 'transparent'; // Boşsa gizle
        }
        updatePlaceholder();
      });
    
      // İlk durumu kontrol et
      if (!input.value) {
        input.style.color = 'transparent'; // Boşsa gizle
      } else {
        input.style.color = '#888'; // Değer varsa görünür
      }
      updatePlaceholder();
    }

  // --- Modal Functions ---
  window.openVehicleModal = function() {
    const modal = getModal();
    if (modal) {
      isEditMode = false;
      editingVehicleId = null;
      resetVehicleForm();

      // Modal container yüksekliğini garanti et (JS override)
      const modalContainer = modal.querySelector('.modal-container');
      if (modalContainer) {
        modalContainer.style.height = 'calc(100vh - 50px)';
        modalContainer.style.maxHeight = 'calc(100vh - 50px)';
      }

      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.classList.add('active');
        // Modal açıldığında tarih placeholder'larını kur
        $all('input[type="date"].form-input', modal).forEach(input => {
          setupDatePlaceholder(input);
        });
        // Hover class'larını ayarla
        updateRadioButtonHover();
      });
    }
  };

  window.closeVehicleModal = function() {
    const modal = getModal();
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.style.display = 'none', 300);
      resetVehicleForm();
    }
  };

  // --- Edit Vehicle Function ---
  window.editVehicle = function(vehicleId) {
    const vehicles = readVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      alert("Taşıt bulunamadı!");
      return;
    }

    const modal = getModal();
    if (!modal) return;

    isEditMode = true;
    editingVehicleId = vehicleId;

    // Formu doldur
    const plateInput = document.getElementById("vehicle-plate");
    const yearInput = document.getElementById("vehicle-year");
    const brandModelInput = document.getElementById("vehicle-brand-model");
    const kmInput = document.getElementById("vehicle-km");
    
    if (plateInput) plateInput.value = vehicle.plate || '';
    if (yearInput) yearInput.value = vehicle.year || '';
    if (brandModelInput) brandModelInput.value = vehicle.brandModel || '';
    if (kmInput) kmInput.value = vehicle.km || '';
    
    // Hata sınıflarını temizle
    [plateInput, yearInput, brandModelInput, kmInput].forEach(el => {
      if (el) el.classList.remove('field-error');
    });

    // Taşıt tipi
    $all('.vehicle-type-btn', modal).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.type === vehicle.vehicleType) {
        btn.classList.add('active');
      }
    });

    // Şanzıman
    const transmissionSection = $all('.form-section-inline', modal)[1];
    if (transmissionSection && vehicle.transmission) {
      $all('.radio-btn', transmissionSection).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === vehicle.transmission) {
          btn.classList.add('active');
        }
      });
    }

      // Tramer
    const tramerSection = $all('.form-section-inline', modal)[2];
    if (tramerSection && vehicle.tramer) {
      $all('.radio-btn', tramerSection).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === vehicle.tramer) {
          btn.classList.add('active');
        }
      });
      if (vehicle.tramer === 'var') {
        const container = document.getElementById('tramer-records-container');
        if (container) {
          container.style.display = 'block';
          // Yeni format (tramerRecords) varsa onu kullan, yoksa eski format (tramerDetay)
          if (vehicle.tramerRecords && vehicle.tramerRecords.length > 0) {
            loadTramerRecords(vehicle.tramerRecords);
          } else if (vehicle.tramerDetay) {
            // Geriye uyumluluk: Eski format varsa boş array kaydet
            loadTramerRecords([]);
          } else {
            // Boşsa ilk satırı ekle
            loadTramerRecords([]);
          }
        }
      }
    }

    // Boya/Değişen
    const boyaSection = $all('.form-section-inline', modal)[3];
    if (boyaSection && vehicle.boya) {
      $all('.radio-btn', boyaSection).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === vehicle.boya) {
          btn.classList.add('active');
        }
      });
      if (vehicle.boya === 'var') {
        const container = document.getElementById('boya-parts-container');
        if (container) {
          container.style.display = 'block';
          // SVG'yi yükle ve parça durumlarını yükle
          initBoyaPartsSVG();
          // SVG yüklendikten sonra durumları yükle (setTimeout ile biraz bekle)
          setTimeout(() => {
            if (vehicle.boyaliParcalar && Object.keys(vehicle.boyaliParcalar).length > 0) {
              loadBoyaPartsState(vehicle.boyaliParcalar);
            }
          }, 300);
        }
      }
    }

    // Tarihler
    if (vehicle.sigortaDate) {
      $all('input[type="date"].form-input', modal)[0].value = vehicle.sigortaDate;
    }
    if (vehicle.kaskoDate) {
      $all('input[type="date"].form-input', modal)[1].value = vehicle.kaskoDate;
    }
    if (vehicle.muayeneDate) {
      $all('input[type="date"].form-input', modal)[2].value = vehicle.muayeneDate;
    }

    // Yedek Anahtar
    const anahtarSection = $all('.form-section-inline', modal)[4];
    if (anahtarSection && vehicle.anahtar) {
      $all('.radio-btn', anahtarSection).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === vehicle.anahtar) {
          btn.classList.add('active');
        }
      });
      if (vehicle.anahtar === 'var' && vehicle.anahtarNerede) {
        const detay = document.getElementById('anahtar-nerede');
        if (detay) {
          detay.value = vehicle.anahtarNerede;
          detay.style.display = 'block';
        }
      }
    }

    // Kredi/Rehin
    const krediSection = $all('.form-section-inline', modal)[5];
    if (krediSection && vehicle.kredi) {
      $all('.radio-btn', krediSection).forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === vehicle.kredi) {
          btn.classList.add('active');
        }
      });
      if (vehicle.kredi === 'var' && vehicle.krediDetay) {
        const detay = document.getElementById('kredi-detay');
        if (detay) {
          detay.value = vehicle.krediDetay;
          detay.style.display = 'block';
        }
      }
    }

    // Şube
    if (vehicle.branchId) {
      const branchSelect = document.getElementById("vehicle-branch-select");
      if (branchSelect) branchSelect.value = vehicle.branchId;
    }

    // Fiyat ve Notlar
    const priceInput = document.getElementById("vehicle-price");
    if (priceInput) priceInput.value = vehicle.price || '';
    
    const notesInput = document.getElementById("vehicle-notes");
    if (notesInput) notesInput.value = vehicle.notes || '';

    // Modal başlığını güncelle
    updateModalTitle("TAŞIT DÜZENLE");

    // Modal container yüksekliğini garanti et (JS override)
    const modalContainer = modal.querySelector('.modal-container');
    if (modalContainer) {
      modalContainer.style.height = 'calc(100vh - 50px)';
      modalContainer.style.maxHeight = 'calc(100vh - 50px)';
    }

    // Modalı aç
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
      $all('input[type="date"].form-input', modal).forEach(input => {
        setupDatePlaceholder(input);
      });
      updateRadioButtonHover();
    });

    // Taşıtlar modalını kapat
    if (window.closeVehiclesModal) {
      window.closeVehiclesModal();
    }
  };

  // --- Delete Vehicle Function ---
  window.deleteVehicle = function(vehicleId) {
    if (!confirm("Bu taşıtı silmek istediğinize emin misiniz?")) {
      return;
    }

    const vehicles = readVehicles();
    const filtered = vehicles.filter(v => v.id !== vehicleId);
    writeVehicles(filtered);

    alert("Taşıt silindi!");
    
    // Eğer taşıtlar modalı açıksa listeyi yenile
    if (window.renderVehicles) {
      window.renderVehicles();
    }
  };

  // --- Save Function ---
  /**
   * Taşıt kaydını formdan okuyup localStorage'a kaydeder
   * 
   * Validasyon + Kaydetme işlemi:
   * 1. Zorunlu alanları kontrol et (plaka, yıl, marka/model, km, şanzıman, tramer)
   * 2. Hata varsa kullanıcıya uyarı göster ve ilk hatalı alana focus yap
   * 3. Tüm form verilerini oku (tarihler, radio button'lar, select'ler, textarea'lar)
   * 4. Kayıt objesi oluştur (id, timestamps ile)
   * 5. Edit modunda mevcut kaydı güncelle, yeni modunda ekle
   * 6. localStorage'a yaz ve kullanıcıya bilgi ver
   * 
   * @throws {Error} localStorage yazma hatası durumunda uygulama crash olabilir
   * (Hata yakalama henüz eklenmedi - rapor önerisi #6)
   */
  window.saveVehicleRecord = function() {
    try {
      const modal = getModal();
      if (!modal) return;

      // Zorunlu alanları kontrol et ve kırmızı çerçeve ekle
    const plateEl = document.getElementById("vehicle-plate");
    const yearEl = document.getElementById("vehicle-year");
    const brandModelEl = document.getElementById("vehicle-brand-model");
    const kmEl = document.getElementById("vehicle-km");
    const transmissionSection = $all('.form-section-inline', modal)[1];
    const tramerSection = $all('.form-section-inline', modal)[2];
    const transmissionBtn = $('.radio-group button.active', transmissionSection);
    const tramerBtn = $('.radio-group button.active', tramerSection);
    
    // Tüm hata sınıflarını temizle
    [plateEl, yearEl, brandModelEl, kmEl].forEach(el => {
      if (el) el.classList.remove('field-error');
    });
    if (transmissionSection) transmissionSection.classList.remove('field-error');
    if (tramerSection) tramerSection.classList.remove('field-error');
    
    // Get form values (validation sonrası)
    const plate = plateEl?.value.trim() || '';
    const year = yearEl?.value || '';
    const brandModel = brandModelEl?.value.trim() || '';
    const km = kmEl?.value.trim() || '';
    
    const activeTypeBtn = $('.vehicle-type-btn.active', modal);
    const vehicleType = activeTypeBtn?.dataset.type || '';
    
    const transmission = transmissionBtn?.dataset.value || '';
    const tramer = tramerBtn?.dataset.value || '';
    
    // Zorunlu alanları kontrol et
    const errors = [];
    if (!plate) {
      errors.push('Plaka');
      if (plateEl) plateEl.classList.add('field-error');
    }
    if (!year) {
      errors.push('Üretim Yılı');
      if (yearEl) yearEl.classList.add('field-error');
    }
    if (!brandModel) {
      errors.push('Marka / Model');
      if (brandModelEl) brandModelEl.classList.add('field-error');
    }
    if (!km) {
      errors.push('Km (Alındığı Tarih)');
      if (kmEl) kmEl.classList.add('field-error');
    }
    if (!transmission) {
      errors.push('Şanzıman Tipi');
      if (transmissionSection) transmissionSection.classList.add('field-error');
    }
    if (!tramer) {
      errors.push('Tramer Kaydı');
      if (tramerSection) tramerSection.classList.add('field-error');
    }
    
    // Hata varsa uyarı göster ve çık
    if (errors.length > 0) {
      alert(`Lütfen Aşağıdaki Alanları Doldurun:\n\n• ${errors.join('\n• ')}`);
      
      // İlk hatalı alana focus
      if (plateEl && !plate) plateEl.focus();
      else if (yearEl && !year) yearEl.focus();
      else if (brandModelEl && !brandModel) brandModelEl.focus();
      else if (kmEl && !km) kmEl.focus();
      
      return;
    }
    const tramerRecords = getTramerRecords();
    const boya = $('.radio-group button.active', $all('.form-section-inline', modal)[3])?.dataset.value || '';
    const boyaliParcalar = getBoyaPartsState();
    
    const sigortaDate = $all('input[type="date"].form-input', modal)[0]?.value || '';
    const kaskoDate = $all('input[type="date"].form-input', modal)[1]?.value || '';
    const muayeneDate = $all('input[type="date"].form-input', modal)[2]?.value || '';
    
    const anahtar = $('.radio-group button.active', $all('.form-section-inline', modal)[4])?.dataset.value || '';
    const anahtarNerede = document.getElementById('anahtar-nerede')?.value.trim() || '';
    const kredi = $('.radio-group button.active', $all('.form-section-inline', modal)[5])?.dataset.value || '';
    const krediDetay = document.getElementById('kredi-detay')?.value.trim() || '';
    
    const branchId = document.getElementById("vehicle-branch-select")?.value || '';
    const price = document.getElementById("vehicle-price")?.value.trim() || '';
    const notes = document.getElementById("vehicle-notes")?.value.trim() || '';
    
    /* UTTS / Takip Cihazı: tasitlar ve raporlarda kullanılıyor; formda radio eklendiğinde buradan okunacak */
    const uttsTanimlandi = false;
    const takipCihaziMontaj = false;

    const record = {
      id: isEditMode ? editingVehicleId : Date.now().toString(),
      plate: plate,
      year: year,
      brandModel: brandModel,
      km: km,
      vehicleType: vehicleType,
      transmission: transmission,
      tramer: tramer,
      tramerRecords: tramerRecords,
      boya: boya,
      boyaliParcalar: boyaliParcalar,
      sigortaDate: sigortaDate,
      kaskoDate: kaskoDate,
      muayeneDate: muayeneDate,
      anahtar: anahtar,
      anahtarNerede: anahtarNerede,
      kredi: kredi,
      krediDetay: krediDetay,
      branchId: branchId,
      price: price,
      notes: notes,
      uttsTanimlandi: uttsTanimlandi,
      takipCihaziMontaj: takipCihaziMontaj,
      events: isEditMode ? undefined : [], // Yeni kayıtlarda boş array
      satildiMi: false,
      createdAt: isEditMode ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Tescil tarihi onay modalını aç (kayıt işlemi oradan devam edecek)
    showTescilTarihConfirmModal(record);
    } catch (error) {
      alert('Kayıt sırasında bir hata oluştu! Lütfen tekrar deneyin.');
    }
  };

  // --- Tescil Tarihi Modal Functions ---
  
  // Global değişken: kayıt işlemi için bekleyen record data
  let pendingRecordData = null;

  /**
   * Tescil tarihi onay modalını açar
   * 
   * @param {Object} recordData - Hazırlanmış record object'i (tescilTarihi hariç)
   */
  function showTescilTarihConfirmModal(recordData) {
    pendingRecordData = recordData;
    
    const modal = document.getElementById('tescil-tarih-confirm-modal');
    if (!modal) return;
    
    const today = new Date();
    const todayFormatted = formatDateForDisplay(today);
    const messageEl = document.getElementById('tescil-confirm-message');
    
    if (messageEl) {
      messageEl.textContent = `Tescil Tarihi ${todayFormatted} olarak kaydedilecektir. Farklı tarih belirlemek ister misiniz?`;
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  /**
   * Onay modalında "Evet" butonuna tıklandığında → Tarih giriş modalını açar
   */
  window.confirmOnay = function() {
    const confirmModal = document.getElementById('tescil-tarih-confirm-modal');
    if (confirmModal) {
      confirmModal.classList.remove('active');
      setTimeout(() => confirmModal.style.display = 'none', 300);
    }
    
    const today = new Date();
    const todayFormatted = formatDateForDisplay(today);
    showTescilTarihInputModal(pendingRecordData, todayFormatted);
  };

  /**
   * Onay modalında "Hayır" butonuna tıklandığında → Bugünün tarihi ile kaydet
   */
  window.cancelOnay = function() {
    const confirmModal = document.getElementById('tescil-tarih-confirm-modal');
    if (confirmModal) {
      confirmModal.classList.remove('active');
      setTimeout(() => confirmModal.style.display = 'none', 300);
    }
    
    const today = new Date();
    const todayFormatted = formatDateForDisplay(today);
    performSave(pendingRecordData, todayFormatted);
  };

  /**
   * Tescil tarihi input overlay'ini günceller (gg kısmını kırmızı gösterir)
   */
  function updateTescilTarihDisplay() {
    const inputEl = document.getElementById('tescil-tarih-input');
    const overlayEl = document.getElementById('tescil-tarih-overlay');
    
    if (!inputEl || !overlayEl) return;
    
    const value = inputEl.value || '';
    
    if (!value) {
      overlayEl.innerHTML = '';
      overlayEl.style.display = 'none';
      return;
    }
    
    // Input'un stilini al
    const inputStyle = window.getComputedStyle(inputEl);
    const inputRect = inputEl.getBoundingClientRect();
    
    // Overlay'i input'un tam üzerine yerleştir (input'un kendisinin üzerine, padding dahil)
    overlayEl.style.position = 'absolute';
    overlayEl.style.left = '0';
    overlayEl.style.top = '0';
    overlayEl.style.width = '100%';
    overlayEl.style.height = '100%';
    overlayEl.style.fontSize = inputStyle.fontSize || '14px';
    overlayEl.style.fontFamily = inputStyle.fontFamily || 'inherit';
    overlayEl.style.lineHeight = inputStyle.lineHeight || '1.4';
    overlayEl.style.textAlign = inputStyle.textAlign || 'center';
    overlayEl.style.display = 'flex';
    overlayEl.style.alignItems = 'center';
    overlayEl.style.justifyContent = 'center';
    overlayEl.style.paddingLeft = inputStyle.paddingLeft || '8px';
    overlayEl.style.paddingRight = inputStyle.paddingRight || '8px';
    overlayEl.style.paddingTop = inputStyle.paddingTop || '4px';
    overlayEl.style.paddingBottom = inputStyle.paddingBottom || '4px';
    overlayEl.style.boxSizing = 'border-box';
    
    // Overlay'in background'unu transparent yap (input'un kendi background'u görünsün)
    overlayEl.style.background = 'transparent';
    
    // gg/aa/yyyy formatını parse et
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(datePattern);
    
    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      
      // Overlay içeriği: gg kısmı kırmızı, geri kalanı normal renk
      overlayEl.innerHTML = `<span class="tescil-day" style="color: #e1061b;">${day}</span>/${month}/${year}`;
    } else if (value) {
      // Format henüz tamamlanmamışsa, başlangıçtaki rakamları kırmızı yap
      const digitsOnly = value.replace(/[^\d]/g, '');
      const remaining = value.substring(digitsOnly.length);
      if (digitsOnly.length >= 1 && digitsOnly.length <= 2) {
        overlayEl.innerHTML = `<span class="tescil-day" style="color: #e1061b;">${digitsOnly}</span>${remaining}`;
      } else {
        overlayEl.innerHTML = value;
      }
    }
  }

  /**
   * Tescil tarihi giriş modalını açar
   * 
   * @param {Object} recordData - Hazırlanmış record object'i
   * @param {string} defaultDate - Varsayılan tarih (gg/aa/yyyy formatında)
   */
  function showTescilTarihInputModal(recordData, defaultDate) {
    const modal = document.getElementById('tescil-tarih-input-modal');
    if (!modal) return;
    
    const inputEl = document.getElementById('tescil-tarih-input');
    if (inputEl) {
      // Bugünün tarihini varsayılan olarak set et
      const today = new Date();
      const todayFormatted = formatDateForDisplay(today);
      inputEl.value = defaultDate || todayFormatted;
      inputEl.classList.remove('field-error');
      
      // Overlay'i başlangıçta güncelle
      updateTescilTarihDisplay();
      
      // Event listener zaten varsa ekleme (sadece focus ver)
      if (!inputEl.hasAttribute('data-tescil-listener')) {
        inputEl.setAttribute('data-tescil-listener', 'true');
        
        // Input formatlama (6 haneli giriş için otomatik formatlama) ve overlay güncelleme
        inputEl.addEventListener('input', function(e) {
          const inputValue = this.value.replace(/[^\d]/g, '');
          
          // 6 haneli sayı ise otomatik formatla
          if (inputValue.length === 6) {
            const formatted = formatTramerDate(inputValue);
            this.value = formatted;
            this.setSelectionRange(this.value.length, this.value.length);
          } else if (inputValue.length > 6) {
            // 6 haneden fazla ise ilk 6 hanesini al ve formatla
            const formatted = formatTramerDate(inputValue.substring(0, 6));
            this.value = formatted;
            this.setSelectionRange(this.value.length, this.value.length);
          }
          
          // Overlay'i güncelle
          updateTescilTarihDisplay();
        });
      }
      
      // Focus ve cursor'u gg (gün) başına yerleştir
      setTimeout(() => {
        inputEl.focus();
        // Cursor'u başa (gg başına) yerleştir
        inputEl.setSelectionRange(0, 0);
      }, 350);
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
      // Modal açıldıktan sonra overlay pozisyonunu güncelle (birkaç kez, render tamamlanana kadar)
      setTimeout(() => {
        updateTescilTarihDisplay();
        setTimeout(() => updateTescilTarihDisplay(), 50);
        setTimeout(() => updateTescilTarihDisplay(), 150);
      }, 50);
    });
  }

  /**
   * Tarih giriş modalında "Kaydet" butonuna tıklandığında → Girilen tarih ile kaydet
   */
  window.saveTescilTarihi = function() {
    const inputEl = document.getElementById('tescil-tarih-input');
    if (!inputEl || !pendingRecordData) return;
    
    const dateStr = inputEl.value.trim();
    
    // Validasyon
    const validation = validateDateInput(dateStr);
    if (!validation.valid) {
      alert(validation.message);
      inputEl.classList.add('field-error');
      inputEl.focus();
      return;
    }
    
    // Modal kapat
    const inputModal = document.getElementById('tescil-tarih-input-modal');
    if (inputModal) {
      inputModal.classList.remove('active');
      setTimeout(() => inputModal.style.display = 'none', 300);
    }
    
    // Kaydet
    performSave(pendingRecordData, dateStr);
  };

  /**
   * Tarih giriş modalında "Vazgeç" butonuna tıklandığında → Modal kapat, iptal et
   */
  window.cancelTescilTarihi = function() {
    const inputModal = document.getElementById('tescil-tarih-input-modal');
    if (inputModal) {
      inputModal.classList.remove('active');
      setTimeout(() => inputModal.style.display = 'none', 300);
    }
    
    // Temizle
    const inputEl = document.getElementById('tescil-tarih-input');
    if (inputEl) {
      inputEl.value = '';
      inputEl.classList.remove('field-error');
    }
    
    pendingRecordData = null;
  };

  /**
   * Kayıt işlemini yapar (tescilTarihi ile)
   * 
   * @param {Object} recordData - Hazırlanmış record object'i (tescilTarihi hariç)
   * @param {string} tescilTarihi - Tescil tarihi (gg/aa/yyyy formatında)
   */
  function performSave(recordData, tescilTarihi) {
    try {
      // Tescil tarihini record'a ekle
      const record = {
        ...recordData,
        tescilTarihi: tescilTarihi || ''
      };

      let vehicles = readVehicles();
      
      if (isEditMode) {
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
          vehicles[index] = { ...vehicles[index], ...record };
        }
      } else {
        // Yeni kayıt: İlk km'yi guncelKm olarak ayarla ve tarihçeye ekle
        if (record.km) {
          record.guncelKm = record.km.replace(/\./g, ''); // Noktaları temizle
          
          // İlk km revizyon event'i ekle (eskiKm: '-', yeniKm: ilk km)
          if (!record.events) record.events = [];
          const event = {
            id: Date.now().toString(),
            type: 'km-revize',
            date: formatDateForDisplay(new Date()),
            timestamp: new Date().toISOString(),
            data: {
              eskiKm: '-',
              yeniKm: record.guncelKm
            }
          };
          record.events.unshift(event);
        }
        
        vehicles.unshift(record);
      }

      writeVehicles(vehicles);
      
      // window.appData'yı güncelle ve sunucuya kaydet
      if (window.appData) {
        window.appData.tasitlar = vehicles;
        // Sunucuya kaydet (async, hata durumunda sessizce devam et)
        if (window.saveDataToServer) {
          window.saveDataToServer().catch(err => {
            console.error('Sunucuya kaydetme hatası (sessiz):', err);
          });
        }
      }
      
      // Bildirimleri güncelle
      if (window.updateNotifications) window.updateNotifications();
      
      alert(isEditMode ? "Kayıt Güncellendi!" : "Yeni Kayıt Oluşturuldu!");
      window.closeVehicleModal();
      
      // Temizle
      pendingRecordData = null;
    } catch (error) {
      alert('Kayıt sırasında bir hata oluştu! Lütfen tekrar deneyin.');
    }
  }

  // --- Radio Button Hover Helper ---
  /**
   * Radio button gruplarına dinamik hover renkleri ekler
   * 
   * Her grup tipine göre farklı hover renkleri:
   * - Şanzıman: Tüm butonlar kırmızı hover
   * - Tramer/Boya: Var=kırmızı, Yok=yeşil hover
   * - Yedek Anahtar: Var=yeşil, Yok=kırmızı hover
   * - Kredi/Rehin: Var=kırmızı, Yok=yeşil hover
   * 
   * Mantık:
   * 1. Tüm radio gruplarını bul
   * 2. Her grubun label'ından grup tipini belirle
   * 3. Aktif olmayan butonlara uygun hover class'ı ekle (hover-red veya hover-green)
   * 
   * Not: Aktif butonlara hover class'ı eklenmez
   */
  function updateRadioButtonHover() {
    $all(".radio-group", getModal()).forEach(group => {
      const sectionLabel = group.closest(".form-section-inline")?.querySelector(".form-label")?.textContent || "";
      const isSanziman = sectionLabel.includes("Şanzıman");
      const isTramer = sectionLabel.includes("Tramer");
      const isBoya = sectionLabel.includes("Boya") || sectionLabel.includes("Değişen");
      const isYedekAnahtar = sectionLabel.includes("Yedek Anahtar");
      const isKrediRehin = sectionLabel.includes("Kredi") || sectionLabel.includes("Rehin");
      
      $all(".radio-btn", group).forEach(btn => {
        // Önce tüm hover class'larını kaldır
        btn.classList.remove("hover-red", "hover-green");
        
        // Aktif buton değilse hover class'ı ekle
        if (!btn.classList.contains("active")) {
          if (isSanziman) {
            // Şanzıman: Her iki buton da kırmızı hover
            btn.classList.add("hover-red");
          } else if (isTramer || isBoya) {
            // Tramer ve Boya Değişen: Var=kırmızı, Yok=yeşil
            if (btn.dataset.value === "var") {
              btn.classList.add("hover-red");
            } else if (btn.dataset.value === "yok") {
              btn.classList.add("hover-green");
            }
          } else if (isYedekAnahtar) {
            // Yedek Anahtar: Var=yeşil, Yok=kırmızı
            if (btn.dataset.value === "var") {
              btn.classList.add("hover-green");
            } else if (btn.dataset.value === "yok") {
              btn.classList.add("hover-red");
            }
          } else if (isKrediRehin) {
            // Kredi Rehin: Var=kırmızı, Yok=yeşil
            if (btn.dataset.value === "var") {
              btn.classList.add("hover-red");
            } else if (btn.dataset.value === "yok") {
              btn.classList.add("hover-green");
            }
          }
        }
      });
    });
  }

  // --- Initialization ---
  document.addEventListener("DOMContentLoaded", () => {
    // Tarih placeholder'ları modal açıldığında kurulacak (openVehicleModal'da)

    // Radio Button Logic
    $all(".radio-btn", getModal()).forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".radio-group");
        $all(".radio-btn", group).forEach(b => b.classList.remove("active", "green"));
        btn.classList.add("active");
        
        // Hata sınıfını kaldır (Şanzıman veya Tramer için)
        const section = btn.closest(".form-section-inline");
        if (section) {
          section.classList.remove('field-error');
        }
        
        // Renk mantığı:
        // Tramer: Var=Kırmızı, Yok=Yeşil
        // Yedek Anahtar: Yok=Kırmızı, Var=Yeşil
        // Kredi/Rehin: Yok=Yeşil, Var=Kırmızı
        const sectionLabel = btn.closest(".form-section-inline")?.querySelector(".form-label")?.textContent || "";
        const isYedekAnahtar = sectionLabel.includes("Yedek Anahtar");
        const isKrediRehin = sectionLabel.includes("Kredi") || sectionLabel.includes("Rehin");
        
        if (isYedekAnahtar) {
          // Yedek Anahtar: Yok=Kırmızı, Var=Yeşil
          if (btn.dataset.value === "var") btn.classList.add("green");
        } else if (isKrediRehin) {
          // Kredi/Rehin: Yok=Yeşil, Var=Kırmızı
          if (btn.dataset.value === "yok") btn.classList.add("green");
        } else {
          // Tramer ve diğerleri: Var=Kırmızı, Yok=Yeşil
          if (btn.dataset.value === "yok") btn.classList.add("green");
        }
        
        // Hover class'larını güncelle
        updateRadioButtonHover();
        
        // Tramer kaydı için özel mantık (sectionLabel zaten tanımlı)
        const isTramer = sectionLabel.includes("Tramer");
        
        if (isTramer) {
          const container = document.getElementById('tramer-records-container');
          if (container) {
            if (btn.dataset.value === "var") {
              container.style.display = "block";
              // Eğer container boşsa ilk satırı ekle
              if (container.children.length === 0) {
                addTramerRecordRow();
              }
            } else {
              container.style.display = "none";
              container.innerHTML = ''; // Tüm satırları temizle
            }
          }
          return; // Tramer için özel mantık uygulandı, genel mantığa geçme
        }
        
        // Boya parçaları için özel mantık
        const isBoya = sectionLabel.includes("Boya") || sectionLabel.includes("Değişen");
        
        if (isBoya) {
          const container = document.getElementById('boya-parts-container');
          if (container) {
            if (btn.dataset.value === "var") {
              container.style.display = "block";
              // SVG'yi yükle ve başlat
              initBoyaPartsSVG();
            } else {
              container.style.display = "none";
              // SVG'yi temizleme (bir sonraki açılışta tekrar yüklenecek)
            }
          }
          return; // Boya için özel mantık uygulandı, genel mantığa geçme
        }
        
        const nextElem = section?.nextElementSibling;
        
        if (nextElem) {
            const conditionalInput = nextElem.querySelector("textarea") || nextElem.querySelector("input");
            
            if (conditionalInput) {
                if(btn.dataset.value === "var") {
                    conditionalInput.style.display = "block";
                    nextElem.classList.add("input-visible"); // Container'ı görünür yap
                    conditionalInput.focus();
                } else {
                    conditionalInput.style.display = "none";
                    conditionalInput.value = "";
                    nextElem.classList.remove("input-visible"); // Container'ı gizle
                }
            }
        }
      });
    });
    
    // Vehicle Type Selection
    $all(".vehicle-type-btn", getModal()).forEach(btn => {
        btn.addEventListener("click", () => {
             $all(".vehicle-type-btn", getModal()).forEach(b => b.classList.remove("active"));
             btn.classList.add("active");
        });
    });

    // Plaka - Büyük harfe çevir ve hata sınıfını kaldır
    const plateInput = document.getElementById("vehicle-plate");
    if (plateInput) {
      plateInput.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(cursorPos, cursorPos);
        // Değer girildiğinde hata sınıfını kaldır
        if (this.value.trim()) {
          this.classList.remove('field-error');
        }
      });
    }
    
    // Üretim Yılı - Hata sınıfını kaldır
    const yearInput = document.getElementById("vehicle-year");
    if (yearInput) {
      yearInput.addEventListener('input', function() {
        if (this.value) {
          this.classList.remove('field-error');
        }
      });
    }
    
    // Marka / Model - Hata sınıfını kaldır ve ilk harf büyük
    const brandModelInputEl = document.getElementById("vehicle-brand-model");
    if (brandModelInputEl) {
      brandModelInputEl.addEventListener('input', function() {
        if (this.value.trim()) {
          this.classList.remove('field-error');
        }
      });
      brandModelInputEl.addEventListener('blur', function(e) {
        if (this.value) {
          const cursorPos = this.selectionStart;
          this.value = capitalizeFirstLetter(this.value);
          this.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }
    
    // Km alanı - Binlik ayırıcı ve hata sınıfını kaldır
    const kmInputEl = document.getElementById("vehicle-km");
    if (kmInputEl) {
      kmInputEl.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const oldLength = this.value.length;
        this.value = formatNumberWithSeparator(this.value);
        const newLength = this.value.length;
        const diff = newLength - oldLength;
        this.setSelectionRange(cursorPos + diff, cursorPos + diff);
        // Değer girildiğinde hata sınıfını kaldır
        if (this.value.trim()) {
          this.classList.remove('field-error');
        }
      });
    }

    // Alım Fiyatı - Binlik ayırıcı
    const priceInput = document.getElementById("vehicle-price");
    if (priceInput) {
      priceInput.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const oldLength = this.value.length;
        // " TL" kısmını koru
        const hasTL = this.value.includes(' TL');
        let value = this.value.replace(/ TL/g, '').trim();
        value = formatNumberWithSeparator(value);
        if (value) value += ' TL';
        this.value = value;
        const newLength = this.value.length;
        const diff = newLength - oldLength;
        this.setSelectionRange(cursorPos + diff, cursorPos + diff);
      });
    }


    // Yedek Anahtar - İlk harf büyük
    const anahtarInput = document.getElementById("anahtar-nerede");
    if (anahtarInput) {
      anahtarInput.addEventListener('blur', function(e) {
        if (this.value) {
          const cursorPos = this.selectionStart;
          this.value = capitalizeFirstLetter(this.value);
          this.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }

    // Kredi Rehin Detay - İlk harf büyük
    const krediDetayInput = document.getElementById("kredi-detay");
    if (krediDetayInput) {
      krediDetayInput.addEventListener('blur', function(e) {
        if (this.value) {
          const cursorPos = this.selectionStart;
          this.value = capitalizeFirstLetter(this.value);
          this.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }

    // Notlar Auto-Expand Logic (max 5 satır = 88px) + İlk harf büyük
    const notesArea = document.getElementById("vehicle-notes");
    if(notesArea) {
        notesArea.addEventListener('input', function() {
            this.style.height = 'auto';
            const maxHeight = 88; // 5 satır
            const newHeight = Math.min(this.scrollHeight, maxHeight);
            this.style.height = newHeight + 'px';
            this.style.overflow = this.scrollHeight > maxHeight ? 'auto' : 'hidden';
        });
        notesArea.addEventListener('blur', function() {
          if (this.value) {
            const cursorPos = this.selectionStart;
            this.value = capitalizeFirstLetter(this.value);
            this.setSelectionRange(cursorPos, cursorPos);
          }
        });
    }
    
    // Initialize branch select
    populateBranchSelect();
  });
})();
