<?php
/**
 * Aylık kullanıcı raporu CSV (Excel uyumlu) export.
 * GET period (varsayılan: bu ay). UTF-8 BOM, başlık: Kullanıcı, Taşıt, Plaka, KM, Bakım, Kaza, Kayıt Tarihi.
 */
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="kullanici_raporu_' . date('Y-m-d') . '.csv"');
header('Access-Control-Allow-Origin: *');

$period = $_GET['period'] ?? date('Y-m');
$dataFile = __DIR__ . '/../data/data.json';

if (!file_exists($dataFile)) {
    http_response_code(500);
    echo "\xEF\xBB\xBF"; // BOM
    echo "Hata;Veri dosyası bulunamadı\n";
    exit;
}

$data = json_decode(file_get_contents($dataFile), true);
if (!$data) {
    http_response_code(500);
    echo "\xEF\xBB\xBF";
    echo "Hata;Veri okunamadı\n";
    exit;
}

$users = $data['users'] ?? [];
$tasitlar = $data['tasitlar'] ?? [];
$hareketler = $data['arac_aylik_hareketler'] ?? [];

$userById = [];
foreach ($users as $u) {
    $userById[$u['id']] = $u;
}
$tasitById = [];
foreach ($tasitlar as $t) {
    $tasitById[$t['id']] = $t;
}

// BOM (Türkçe karakter için)
echo "\xEF\xBB\xBF";

$out = fopen('php://output', 'w');
fputcsv($out, ['Kullanıcı', 'Taşıt', 'Plaka', 'KM', 'Bakım', 'Kaza', 'Kayıt Tarihi'], ';');

foreach ($hareketler as $k) {
    if ($k['donem'] !== $period) {
        continue;
    }
    $surucu = $userById[$k['surucu_id']] ?? null;
    $arac = $tasitById[$k['arac_id']] ?? null;
    $surucuAdi = $surucu ? ($surucu['isim'] ?? $surucu['name'] ?? 'Bilinmiyor') : 'Bilinmiyor';
    $aracText = $arac ? trim(($arac['marka'] ?? $arac['brand'] ?? '') . ' ' . ($arac['model'] ?? '')) : 'Bilinmiyor';
    $plaka = $arac ? ($arac['plaka'] ?? $arac['plate'] ?? 'Bilinmiyor') : 'Bilinmiyor';
    $km = $k['guncel_km'] ?? '';
    $bakim = !empty($k['bakim_durumu']) ? 'Evet' : 'Hayır';
    $kaza = !empty($k['kaza_durumu']) ? 'Evet' : 'Hayır';
    $kayitTarihi = isset($k['kayit_tarihi']) ? date('Y-m-d H:i', strtotime($k['kayit_tarihi'])) : '';

    fputcsv($out, [$surucuAdi, $aracText, $plaka, $km, $bakim, $kaza, $kayitTarihi], ';');
}

fclose($out);
?>
