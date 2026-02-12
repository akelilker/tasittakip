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

// Sadece POST kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Sadece POST istekleri kabul edilir'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Input al
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Kullanıcı adı ve şifre gerekli!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Veriyi yükle
$dataFile = __DIR__ . '/../data/data.json';
if (!file_exists($dataFile)) {
    echo json_encode(['success' => false, 'message' => 'Veri dosyası bulunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents($dataFile), true);
if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Veri okunamadı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kullanıcıyı bul: kullanici_adi + şifre dolu olanlar portal girişi yapabilir (aktif yoksa aktif kabul et)
$user = null;
foreach ($data['users'] as $u) {
    $kullaniciEslesiyor = isset($u['kullanici_adi']) && trim((string)$u['kullanici_adi']) !== '' && trim((string)$u['kullanici_adi']) === trim($username);
    $sifreVar = isset($u['sifre']) && trim((string)$u['sifre']) !== '';
    $aktif = !isset($u['aktif']) || $u['aktif'] === true;
    if ($kullaniciEslesiyor && $sifreVar && $aktif) {
        $user = $u;
        break;
    }
}

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Kullanıcı bulunamadı veya aktif değil!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Şifre kontrolü (basit - production'da password_verify kullan)
// Eğer sifre_hash yoksa ve password alanı varsa (eski format), direkt karşılaştır
$passwordMatch = false;
if (isset($user['sifre_hash'])) {
    // Hash'lenmiş şifre var
    $passwordMatch = password_verify($password, $user['sifre_hash']);
} elseif (isset($user['sifre'])) {
    // Plain text şifre (geçici - güvenli değil)
    $passwordMatch = ($password === $user['sifre']);
}

if (!$passwordMatch) {
    echo json_encode(['success' => false, 'message' => 'Şifre hatalı!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Token oluştur (basit JWT benzeri)
$token = base64_encode(json_encode([
    'user_id' => $user['id'],
    'exp' => time() + (30 * 24 * 60 * 60) // 30 gün
]));

// Son giriş zamanını güncelle
foreach ($data['users'] as &$u) {
    if ($u['id'] === $user['id']) {
        $u['son_giris'] = date('c');
        break;
    }
}
unset($u);

// Veriyi kaydet
file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// Başarılı yanıt
echo json_encode([
    'success' => true,
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'isim' => $user['isim'] ?? $user['name'] ?? ''
    ]
], JSON_UNESCAPED_UNICODE);
?>
