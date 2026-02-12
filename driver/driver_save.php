<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Token doğrulama
function validateToken() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader)) {
        return null;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $decoded = json_decode(base64_decode($token), true);
    
    if (!$decoded || !isset($decoded['exp']) || $decoded['exp'] < time()) {
        return null;
    }
    
    return $decoded;
}

// Token doğrula
$tokenData = validateToken();
if (!$tokenData) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Oturumunuz sona erdi!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Input al
$input = json_decode(file_get_contents('php://input'), true);
$aracId = intval($input['arac_id'] ?? 0);
$guncelKm = intval($input['guncel_km'] ?? 0);
$bakimDurumu = intval($input['bakim_durumu'] ?? 0);
$bakimAciklama = trim($input['bakim_aciklama'] ?? '');
$bakimTarih = trim($input['bakim_tarih'] ?? '');
$kazaDurumu = intval($input['kaza_durumu'] ?? 0);
$kazaAciklama = trim($input['kaza_aciklama'] ?? '');
$kazaTarih = trim($input['kaza_tarih'] ?? '');
$kazaHasarTutari = trim($input['kaza_hasar_tutari'] ?? '');
$bakimServis = trim($input['bakim_servis'] ?? '');
$bakimKisi = trim($input['bakim_kisi'] ?? '');
$bakimKm = trim($input['bakim_km'] ?? '');
$bakimTutar = trim($input['bakim_tutar'] ?? '');
$ekstraNot = trim($input['ekstra_not'] ?? '');

// Kaporta: boya_parcalar (partId => boyali|degisen)
$boyaParcalar = [];
$boyaParcalarRaw = $input['boya_parcalar'] ?? '';
if ($boyaParcalarRaw !== '') {
    $decoded = json_decode($boyaParcalarRaw, true);
    if (is_array($decoded)) {
        foreach ($decoded as $partId => $state) {
            if (is_string($partId) && $partId !== '' && in_array($state, ['boyali', 'degisen'], true)) {
                $boyaParcalar[$partId] = $state;
            }
        }
    }
}

// Validasyon
if ($aracId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz Taşıt ID!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($guncelKm <= 0) {
    echo json_encode(['success' => false, 'message' => 'Geçerli bir KM değeri girin!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($bakimDurumu && empty($bakimAciklama)) {
    echo json_encode(['success' => false, 'message' => 'Bakım detayı girmelisiniz!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($kazaDurumu && empty($kazaAciklama)) {
    echo json_encode(['success' => false, 'message' => 'Kaza açıklaması girmelisiniz!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Max karakter kontrolü
if (strlen($bakimAciklama) > 500) {
    echo json_encode(['success' => false, 'message' => 'Bakım detayı çok uzun! (Max 500 karakter)'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($kazaAciklama) > 500) {
    echo json_encode(['success' => false, 'message' => 'Kaza açıklaması çok uzun! (Max 500 karakter)'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Veriyi yükle
$dataFile = __DIR__ . '/../data/data.json';
if (!file_exists($dataFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Veri dosyası bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents($dataFile), true);
if (!$data) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Veri okunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kullanıcı yetkisi kontrolü
$user = null;
foreach ($data['users'] as $u) {
    if ($u['id'] === $tokenData['user_id']) {
        $user = $u;
        break;
    }
}

if (!$user) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Taşıt zimmet kontrolü (assignedUserId veya zimmetli_araclar)
$tasitlarCheck = $data['tasitlar'] ?? [];
$hasAccess = false;
foreach ($tasitlarCheck as $t) {
    if (isset($t['id']) && (string)$t['id'] === (string)$aracId) {
        $assignedUserId = $t['assignedUserId'] ?? null;
        if ($assignedUserId !== null && (string)$assignedUserId === (string)$user['id']) {
            $hasAccess = true;
            break;
        }
    }
}
// Yedek: eski zimmetli_araclar sistemi
if (!$hasAccess) {
    $zimmetliAraclar = $user['zimmetli_araclar'] ?? [];
    if (in_array($aracId, $zimmetliAraclar)) {
        $hasAccess = true;
    }
}
if (!$hasAccess) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Bu Taşıta Erişim Yetkiniz Yok!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Dönem (bu ay)
$donem = date('Y-m');

// Aynı ay için kayıt var mı kontrol et
$existingIndex = -1;
foreach ($data['arac_aylik_hareketler'] as $idx => $kayit) {
    if ($kayit['arac_id'] === $aracId && $kayit['donem'] === $donem && $kayit['surucu_id'] === $user['id']) {
        $existingIndex = $idx;
        break;
    }
}

// KM uyarı kontrolü
$warning = null;
$lastKm = null;

// Geçen ay kaydını bul
$lastMonth = date('Y-m', strtotime('-1 month'));
foreach ($data['arac_aylik_hareketler'] as $kayit) {
    if ($kayit['arac_id'] === $aracId && $kayit['donem'] === $lastMonth) {
        $lastKm = $kayit['guncel_km'];
        break;
    }
}

// KM validasyonu
if ($lastKm !== null) {
    if ($guncelKm < $lastKm) {
        $warning = "⚠️ Uyarı: KM geriye gidiyor! (Geçen ay: $lastKm km, Bu ay: $guncelKm km)";
    } elseif (($guncelKm - $lastKm) > 10000) {
        $diff = $guncelKm - $lastKm;
        $warning = "⚠️ Uyarı: KM çok fazla artmış ($diff km). Lütfen kontrol edin.";
    }
}

// Yeni ID oluştur (mevcut kayıtlar arasında en büyük ID + 1)
$newId = 1;
foreach ($data['arac_aylik_hareketler'] as $kayit) {
    if ($kayit['id'] >= $newId) {
        $newId = $kayit['id'] + 1;
    }
}

// Kayıt verisi
$kayitData = [
    'id' => $existingIndex >= 0 ? $data['arac_aylik_hareketler'][$existingIndex]['id'] : $newId,
    'arac_id' => $aracId,
    'surucu_id' => $user['id'],
    'donem' => $donem,
    'guncel_km' => $guncelKm,
    'bakim_durumu' => $bakimDurumu,
    'bakim_aciklama' => $bakimAciklama,
    'bakim_tarih' => $bakimTarih,
    'kaza_durumu' => $kazaDurumu,
    'kaza_aciklama' => $kazaAciklama,
    'kaza_tarih' => $kazaTarih,
    'ekstra_not' => $ekstraNot,
    'kayit_tarihi' => $existingIndex >= 0 ? $data['arac_aylik_hareketler'][$existingIndex]['kayit_tarihi'] : date('c'),
    'guncelleme_tarihi' => date('c'),
    'durum' => 'onaylandi'
];

// Kaydet veya güncelle
if ($existingIndex >= 0) {
    // Güncelle
    $data['arac_aylik_hareketler'][$existingIndex] = $kayitData;
} else {
    // Yeni kayıt ekle
    $data['arac_aylik_hareketler'][] = $kayitData;
}

// Taşıtlar detay ekranı senkronizasyonu: tasitlar içindeki araç guncelKm ve events güncelle
$tasitlar = &$data['tasitlar'];
$kullaniciAdi = $user['isim'] ?? $user['name'] ?? '';
if (is_array($tasitlar)) {
    foreach ($tasitlar as $idx => $vehicle) {
        $vid = isset($vehicle['id']) ? (is_numeric($vehicle['id']) ? intval($vehicle['id']) : $vehicle['id']) : null;
        if ($vid === null || (string)$vid !== (string)$aracId) {
            continue;
        }
        $eskiKm = $tasitlar[$idx]['guncelKm'] ?? $tasitlar[$idx]['km'] ?? null;
        if ($eskiKm !== null) {
            $eskiKm = (string) $eskiKm;
        }
        // guncelKm güncelle
        $tasitlar[$idx]['guncelKm'] = $guncelKm;
        // boya_parcalar: taşıt boyaliParcalar merge, boya=var
        if (!empty($boyaParcalar)) {
            $mevcut = isset($tasitlar[$idx]['boyaliParcalar']) && is_array($tasitlar[$idx]['boyaliParcalar'])
                ? $tasitlar[$idx]['boyaliParcalar'] : [];
            $tasitlar[$idx]['boyaliParcalar'] = array_merge($mevcut, $boyaParcalar);
            $tasitlar[$idx]['boya'] = 'var';
        }
        // events dizisi yoksa oluştur
        if (!isset($tasitlar[$idx]['events']) || !is_array($tasitlar[$idx]['events'])) {
            $tasitlar[$idx]['events'] = [];
        }
        // Km revize event (kullanıcı panelinden kayıt – tarihçede görünsün)
        array_unshift($tasitlar[$idx]['events'], [
            'id' => (string)(time() . $idx . 'km'),
            'type' => 'km-revize',
            'date' => date('Y-m-d'),
            'timestamp' => date('c'),
            'data' => [
                'eskiKm' => $eskiKm !== null ? $eskiKm : '',
                'yeniKm' => (string) $guncelKm,
                'surucu' => $kullaniciAdi
            ]
        ]);
        // Bakım bildirimi varsa işlem geçmişine ekle
        if ($bakimDurumu && !empty($bakimAciklama)) {
            $eventDate = !empty($bakimTarih) ? $bakimTarih : date('Y-m-d');
            array_unshift($tasitlar[$idx]['events'], [
                'id' => (string)(time() . $idx . 'b'),
                'type' => 'bakim',
                'date' => $eventDate,
                'timestamp' => date('c'),
                'data' => [
                    'islemler' => $bakimAciklama,
                    'servis' => $bakimServis,
                    'kisi' => $bakimKisi,
                    'km' => $bakimKm,
                    'tutar' => $bakimTutar
                ]
            ]);
        }
        // Kaza bildirimi varsa işlem geçmişine ekle
        if ($kazaDurumu && !empty($kazaAciklama)) {
            $eventDate = !empty($kazaTarih) ? $kazaTarih : date('Y-m-d');
            $kazaData = [
                'aciklama' => $kazaAciklama,
                'surucu' => $kullaniciAdi,
                'hasarTutari' => $kazaHasarTutari
            ];
            if (!empty($boyaParcalar)) {
                $kazaData['hasarParcalari'] = $boyaParcalar;
            }
            array_unshift($tasitlar[$idx]['events'], [
                'id' => (string)(time() . $idx . 'k'),
                'type' => 'kaza',
                'date' => $eventDate,
                'timestamp' => date('c'),
                'data' => $kazaData
            ]);
        }
        break;
    }
}

// Veriyi kaydet
file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// Başarılı yanıt
$response = [
    'success' => true,
    'message' => 'Veri kaydedildi!'
];

if ($warning) {
    $response['warning'] = $warning;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>
