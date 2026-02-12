<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Sadece POST kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/data.json';

// data klasörü yoksa oluştur
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// POST verisini al
$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Boş veri']);
    exit;
}

// JSON geçerliliğini kontrol et
$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Geçersiz JSON']);
    exit;
}

// Yedek oluştur (önceki veriyi .backup olarak kaydet)
if (file_exists($dataFile)) {
    $backupFile = $dataDir . '/data.json.backup';
    copy($dataFile, $backupFile);
}

// Veriyi kaydet
$result = file_put_contents($dataFile, $input);
if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Veri kaydedilemedi']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Veri kaydedildi']);
?>