<?php
/**
 * Static Asset Loader - JS/CSS dosyalarını PHP üzerinden sun
 * WordPress rewrite kuralları .js dosyalarını engellerken .php çalışıyor.
 * Bu dosya JS/CSS'i doğru Content-Type ile sunarak 404 sorununu çözer.
 */

$file = isset($_GET['f']) ? $_GET['f'] : '';

// Güvenlik: sadece izinli dosyalar
$allowed = [
    // JS
    'data-manager.js',
    'script-core.js',
    'kayit.js',
    'tasitlar.js',
    'raporlar.js',
    'ayarlar.js',
    'sw.js',
    // CSS
    'style-core.css',
    'kayit.css',
    'tasitlar.css',
    'raporlar.css',
    'ayarlar.css',
    // Driver
    'driver/driver-script.js',
    'driver/driver-style.css',
    // Admin
    'admin/admin-report.js',
    'admin/admin-report.css',
];

if (!in_array($file, $allowed)) {
    http_response_code(404);
    echo '// File not allowed';
    exit;
}

$path = __DIR__ . '/' . $file;

if (!file_exists($path)) {
    http_response_code(404);
    echo '// File not found: ' . $file;
    exit;
}

// Content-Type belirle
$ext = pathinfo($file, PATHINFO_EXTENSION);
$types = [
    'js'  => 'application/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
];
$contentType = isset($types[$ext]) ? $types[$ext] : 'text/plain';

// Cache headers (1 saat)
header('Content-Type: ' . $contentType);
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');

readfile($path);
