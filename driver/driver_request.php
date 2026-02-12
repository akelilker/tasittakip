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
$kayitId = intval($input['kayit_id'] ?? 0);
$yeniKm = isset($input['yeni_km']) ? intval($input['yeni_km']) : null;
$yeniBakimDurumu = isset($input['yeni_bakim_durumu']) ? intval($input['yeni_bakim_durumu']) : null;
$yeniBakimAciklama = isset($input['yeni_bakim_aciklama']) ? trim($input['yeni_bakim_aciklama']) : null;
$yeniKazaDurumu = isset($input['yeni_kaza_durumu']) ? intval($input['yeni_kaza_durumu']) : null;
$yeniKazaAciklama = isset($input['yeni_kaza_aciklama']) ? trim($input['yeni_kaza_aciklama']) : null;
$sebep = trim($input['sebep'] ?? '');

// Validasyon
if ($kayitId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz kayıt ID!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($sebep)) {
    echo json_encode(['success' => false, 'message' => 'Düzeltme sebebini yazmalısınız!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($sebep) > 500) {
    echo json_encode(['success' => false, 'message' => 'Sebep açıklaması çok uzun! (Max 500 karakter)'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($yeniKm !== null && $yeniKm <= 0) {
    echo json_encode(['success' => false, 'message' => 'Geçerli bir KM değeri girin!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($yeniBakimAciklama !== null && strlen($yeniBakimAciklama) > 500) {
    echo json_encode(['success' => false, 'message' => 'Bakım açıklaması çok uzun! (Max 500 karakter)'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($yeniKazaAciklama !== null && strlen($yeniKazaAciklama) > 500) {
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

// Kaydı bul
$kayit = null;
foreach ($data['arac_aylik_hareketler'] as $k) {
    if ($k['id'] === $kayitId) {
        $kayit = $k;
        break;
    }
}

if (!$kayit) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Kayıt bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kayıt bu kullanıcıya ait mi kontrol et
if ($kayit['surucu_id'] !== $tokenData['user_id']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Bu kayda erişim yetkiniz yok!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// En az bir değişiklik olmalı
$kmChanged = $yeniKm !== null && $yeniKm !== (int)($kayit['guncel_km'] ?? 0);
$bakimChanged = $yeniBakimAciklama !== null;
$kazaChanged = $yeniKazaAciklama !== null;
if (!$kmChanged && !$bakimChanged && !$kazaChanged) {
    echo json_encode(['success' => false, 'message' => 'En az bir alanda değişiklik yapmalısınız!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Yeni talep ID oluştur
$newTalepId = 1;
if (isset($data['duzeltme_talepleri'])) {
    foreach ($data['duzeltme_talepleri'] as $talep) {
        if ($talep['id'] >= $newTalepId) {
            $newTalepId = $talep['id'] + 1;
        }
    }
} else {
    $data['duzeltme_talepleri'] = [];
}

// Talep verisi
$talepData = [
    'id' => $newTalepId,
    'kayit_id' => $kayitId,
    'surucu_id' => $tokenData['user_id'],
    'talep_tarihi' => date('c'),
    'sebep' => $sebep,
    'eski_km' => $kayit['guncel_km'] ?? null,
    'yeni_km' => $kmChanged ? $yeniKm : null,
    'eski_bakim_durumu' => $kayit['bakim_durumu'] ?? 0,
    'eski_bakim_aciklama' => $kayit['bakim_aciklama'] ?? '',
    'yeni_bakim_durumu' => $bakimChanged ? ($yeniBakimDurumu !== null ? $yeniBakimDurumu : ($yeniBakimAciklama ? 1 : 0)) : null,
    'yeni_bakim_aciklama' => $bakimChanged ? ($yeniBakimAciklama ?? '') : null,
    'eski_kaza_durumu' => $kayit['kaza_durumu'] ?? 0,
    'eski_kaza_aciklama' => $kayit['kaza_aciklama'] ?? '',
    'yeni_kaza_durumu' => $kazaChanged ? ($yeniKazaDurumu !== null ? $yeniKazaDurumu : ($yeniKazaAciklama ? 1 : 0)) : null,
    'yeni_kaza_aciklama' => $kazaChanged ? ($yeniKazaAciklama ?? '') : null,
    'durum' => 'beklemede',
    'admin_yanit_tarihi' => null,
    'admin_notu' => null,
    'admin_id' => null
];

// Talebi ekle
$data['duzeltme_talepleri'][] = $talepData;

// Veriyi kaydet
file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// Başarılı yanıt
echo json_encode([
    'success' => true,
    'message' => 'Düzeltme talebiniz gönderildi! Admin onayı bekleniyor.',
    'talep_id' => $newTalepId
], JSON_UNESCAPED_UNICODE);
?>
