<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Token doğrulama fonksiyonu
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

// Taşıt objesini sürücü response formatına dönüştür
function buildVehicleForDriver($tasit) {
    return [
        'id' => $tasit['id'],
        'plaka' => $tasit['plaka'] ?? $tasit['plate'] ?? '',
        'marka' => $tasit['marka'] ?? $tasit['brand'] ?? '',
        'model' => $tasit['model'] ?? '',
        'tip' => $tasit['tip'] ?? 'otomobil',
        'boya' => $tasit['boya'] ?? '',
        'boyaliParcalar' => $tasit['boyaliParcalar'] ?? [],
        'anahtar' => $tasit['anahtar'] ?? '',
        'anahtarNerede' => $tasit['anahtarNerede'] ?? '',
        'lastikDurumu' => $tasit['lastikDurumu'] ?? '',
        'lastikAdres' => $tasit['lastikAdres'] ?? '',
        'uttsTanimlandi' => $tasit['uttsTanimlandi'] ?? false,
        'muayeneDate' => $tasit['muayeneDate'] ?? ''
    ];
}

// Kullanıcıyı bul
$user = null;
foreach ($data['users'] as $u) {
    if ($u['id'] === $tokenData['user_id']) {
        $user = $u;
        break;
    }
}

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Atanmış araçları bul (tek kaynak: tasit.assignedUserId)
$vehicles = [];
$tasitlar = $data['tasitlar'] ?? [];
foreach ($tasitlar as $tasit) {
    $assignedUserId = $tasit['assignedUserId'] ?? null;
    if ($assignedUserId !== null && (string)$assignedUserId === (string)$user['id']) {
        $vehicles[] = buildVehicleForDriver($tasit);
    }
}
// Eski format yedek: zimmetli_araclar varsa ve assignedUserId ile araç bulunamadıysa kullanılabilir
if (count($vehicles) === 0 && !empty($user['zimmetli_araclar'])) {
    $zimmetliAraclar = $user['zimmetli_araclar'];
    foreach ($zimmetliAraclar as $aracId) {
        foreach ($tasitlar as $tasit) {
            if (isset($tasit['id']) && (string)$tasit['id'] === (string)$aracId) {
                $vehicles[] = buildVehicleForDriver($tasit);
                break;
            }
        }
    }
}

// Bu ay için mevcut kayıtları bul
$currentPeriod = date('Y-m');
$records = [];
$assignedVehicleIds = array_map(function ($v) { return $v['id']; }, $vehicles);
foreach ($data['arac_aylik_hareketler'] ?? [] as $kayit) {
    if (isset($kayit['surucu_id']) && (string)$kayit['surucu_id'] === (string)$user['id'] && in_array($kayit['arac_id'], $assignedVehicleIds)) {
        $records[] = $kayit;
    }
}

// Başarılı yanıt
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'isim' => $user['isim']
    ],
    'vehicles' => $vehicles,
    'records' => $records,
    'current_period' => $currentPeriod
], JSON_UNESCAPED_UNICODE);
?>
