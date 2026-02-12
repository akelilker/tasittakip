<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$dataFile = __DIR__ . '/data/data.json';

// Dosya yoksa boş veri yapısı döndür
if (!file_exists($dataFile)) {
    echo json_encode([
        'tasitlar' => [],
        'kayitlar' => [],
        'branches' => [],
        'users' => [],
        'ayarlar' => [
            'sirketAdi' => 'Medisa',
            'yetkiliKisi' => '',
            'telefon' => '',
            'eposta' => ''
        ],
        'sifreler' => [],
        'arac_aylik_hareketler' => [],
        'duzeltme_talepleri' => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Dosyayı oku
$content = file_get_contents($dataFile);

// Dosya okunamazsa hata döndür
if ($content === false) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Veri dosyası okunamadı',
        'file_path' => $dataFile
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// JSON geçerliliğini kontrol et
$data = json_decode($content, true);
if ($data === null) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Bozuk JSON verisi',
        'json_error' => json_last_error_msg()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Veriyi döndür
echo $content;
?>