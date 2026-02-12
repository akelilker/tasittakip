<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Input al
$input = json_decode(file_get_contents('php://input'), true);
$requestId = intval($input['request_id'] ?? 0);
$action = $input['action'] ?? ''; // 'approve' veya 'reject'
$adminNote = trim($input['admin_note'] ?? '');

// Validasyon
if ($requestId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Geçersiz talep ID!'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action !== 'approve' && $action !== 'reject') {
    echo json_encode(['success' => false, 'message' => 'Geçersiz işlem! (approve veya reject)'], JSON_UNESCAPED_UNICODE);
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

// Talebi bul
$talepIndex = -1;
$talep = null;
foreach ($data['duzeltme_talepleri'] as $idx => $t) {
    if ($t['id'] === $requestId) {
        $talepIndex = $idx;
        $talep = $t;
        break;
    }
}

if (!$talep) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Talep bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Talep durumu kontrolü
if ($talep['durum'] !== 'beklemede') {
    echo json_encode(['success' => false, 'message' => 'Bu talep zaten işlenmiş!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Talebi güncelle
$data['duzeltme_talepleri'][$talepIndex]['durum'] = $action === 'approve' ? 'onaylandi' : 'reddedildi';
$data['duzeltme_talepleri'][$talepIndex]['admin_yanit_tarihi'] = date('c');
$data['duzeltme_talepleri'][$talepIndex]['admin_notu'] = $adminNote;
$data['duzeltme_talepleri'][$talepIndex]['admin_id'] = 1; // Admin ID (şimdilik sabit)

// Eğer onaylandıysa, ana kaydı güncelle
if ($action === 'approve') {
    $kayitIndex = -1;
    foreach ($data['arac_aylik_hareketler'] as $idx => $k) {
        if ($k['id'] === $talep['kayit_id']) {
            $kayitIndex = $idx;
            break;
        }
    }
    
    if ($kayitIndex >= 0) {
        $kayit = &$data['arac_aylik_hareketler'][$kayitIndex];
        if (isset($talep['yeni_km']) && $talep['yeni_km'] !== null) {
            $kayit['guncel_km'] = $talep['yeni_km'];
        }
        if (isset($talep['yeni_bakim_durumu']) && $talep['yeni_bakim_durumu'] !== null) {
            $kayit['bakim_durumu'] = $talep['yeni_bakim_durumu'];
            $kayit['bakim_aciklama'] = $talep['yeni_bakim_aciklama'] ?? '';
        }
        if (isset($talep['yeni_kaza_durumu']) && $talep['yeni_kaza_durumu'] !== null) {
            $kayit['kaza_durumu'] = $talep['yeni_kaza_durumu'];
            $kayit['kaza_aciklama'] = $talep['yeni_kaza_aciklama'] ?? '';
        }
        $kayit['guncelleme_tarihi'] = date('c');
        // Taşıtlar senkronizasyonu: KM güncellemesi
        if (isset($talep['yeni_km']) && $talep['yeni_km'] !== null) {
            $aracId = $kayit['arac_id'] ?? null;
            if ($aracId && is_array($data['tasitlar'] ?? null)) {
                foreach ($data['tasitlar'] as $idx => $v) {
                    $vid = isset($v['id']) ? (is_numeric($v['id']) ? intval($v['id']) : $v['id']) : null;
                    if ($vid !== null && (string)$vid === (string)$aracId) {
                        $data['tasitlar'][$idx]['guncelKm'] = $talep['yeni_km'];
                        break;
                    }
                }
            }
        }
    }
}

// Veriyi kaydet
file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// Başarılı yanıt
$message = $action === 'approve' ? 'Talep onaylandı, veri güncellendi!' : 'Talep reddedildi!';

echo json_encode([
    'success' => true,
    'message' => $message
], JSON_UNESCAPED_UNICODE);
?>
