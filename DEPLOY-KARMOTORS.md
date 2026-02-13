# karmotors.com.tr - tasitmedisa Deployment

**karmotors** klasörü başka iş için kullanılıyor, içine bir şey eklenmez. Taşıt Takip **subdomain** ile çalışır.

## Erişim Adresi

**https://medisa.karmotors.com.tr/** (veya tasit.karmotors.com.tr)

---

## Kurulum (cPanel)

### 1. Subdomain Oluştur

1. cPanel → **Subdomains** (Alt Alan Adları)
2. **Subdomain:** `medisa` (veya `tasit`)
3. **Domain:** `karmotors.com.tr`
4. **Document Root:** `public_html/tasitmedisa`

Sonuç: **medisa.karmotors.com.tr** → `public_html/tasitmedisa` klasörünü gösterir.

### 2. Dosyalar

Tüm dosyalar **public_html/tasitmedisa** içinde kalır. **karmotors** klasörüne dokunulmaz.

---

## Dosya Yapısı

```
public_html/
├── karmotors/          ← Başka iş (dokunulmaz)
└── tasitmedisa/        ← Taşıt Takip (medisa.karmotors.com.tr document root)
    ├── index.html
    ├── load.php
    ├── save.php
    ├── data/
    ├── tasitlar.js
    └── ...
```

---

## İzinler

- `data/` klasörü: **755** veya **775**
- `data/data.json`: **644** veya **664**
