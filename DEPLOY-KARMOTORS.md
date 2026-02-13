# karmotors.com.tr - tasitmedisa Klasöründe Deployment

Dosyalar **public_html/tasitmedisa** klasöründe kalır. karmotors.com.tr'deki diğer işler etkilenmez.

## Erişim Adresi

**https://karmotors.com.tr/tasitmedisa/**

---

## Kurulum (cPanel)

### Seçenek A: karmotors.com.tr → public_html (WordPress root)

Eğer karmotors.com.tr domain'i **public_html** klasörüne işaret ediyorsa, tasitmedisa zaten `public_html/tasitmedisa` içinde. Bu durumda direkt çalışır:

- **URL:** https://karmotors.com.tr/tasitmedisa/

### Seçenek B: karmotors.com.tr → public_html/karmotors

Eğer karmotors.com.tr **public_html/karmotors** klasörüne işaret ediyorsa, symlink oluştur:

1. cPanel → Dosya Yöneticisi
2. `public_html/karmotors` klasörüne git
3. **+ Klasör** veya **Symlink** (varsa)
4. **Symlink:** `tasitmedisa` → `../tasitmedisa`

   Veya SSH ile:
   ```bash
   cd public_html/karmotors
   ln -s ../tasitmedisa tasitmedisa
   ```

5. **URL:** https://karmotors.com.tr/tasitmedisa/

---

## İzinler

- `data/` klasörü: **755** veya **775** (PHP yazabilmeli)
- `data/data.json`: **644** veya **664**

---

## Dosya Yapısı

```
public_html/
├── karmotors/          ← karmotors.com.tr (diğer işler)
│   └── tasitmedisa → ../tasitmedisa
└── tasitmedisa/        ← Taşıt Takip (tüm dosyalar burada)
    ├── index.html
    ├── load.php
    ├── save.php
    ├── data/
    ├── tasitlar.js
    └── ...
```
