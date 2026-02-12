<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parametreleri al
$period = $_GET['period'] ?? date('Y-m');
$branch = $_GET['branch'] ?? '';
$status = $_GET['status'] ?? '';
$action = $_GET['action'] ?? 'report';

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

// Şube listesi (action=branches)
if ($action === 'branches') {
    $branches = $data['branches'] ?? [];
    echo json_encode(['success' => true, 'branches' => $branches], JSON_UNESCAPED_UNICODE);
    exit;
}

// Bekleyen talepler (action=pending_requests)
if ($action === 'pending_requests') {
    $pendingRequests = [];
    
    foreach ($data['duzeltme_talepleri'] ?? [] as $talep) {
        if ($talep['durum'] === 'beklemede') {
            // Kullanıcı bilgisi
            $surucu = null;
            foreach ($data['users'] as $u) {
                if ($u['id'] === $talep['surucu_id']) {
                    $surucu = $u;
                    break;
                }
            }
            
            // Kayıt bilgisi
            $kayit = null;
            foreach (($data['arac_aylik_hareketler'] ?? []) as $k) {
                if ($k['id'] === $talep['kayit_id']) {
                    $kayit = $k;
                    break;
                }
            }
            
            // Taşıt bilgisi
            $arac = null;
            if ($kayit) {
                foreach ($data['tasitlar'] as $t) {
                    if ($t['id'] === $kayit['arac_id']) {
                        $arac = $t;
                        break;
                    }
                }
            }
            
            $req = [
                'id' => $talep['id'],
                'kayit_id' => $talep['kayit_id'],
                'surucu_id' => $talep['surucu_id'],
                'surucu_adi' => $surucu ? ($surucu['isim'] ?? $surucu['name'] ?? 'Bilinmiyor') : 'Bilinmiyor',
                'plaka' => $arac ? ($arac['plaka'] ?? $arac['plate'] ?? 'Bilinmiyor') : 'Bilinmiyor',
                'donem' => $kayit ? $kayit['donem'] : '',
                'eski_km' => $talep['eski_km'] ?? null,
                'yeni_km' => $talep['yeni_km'] ?? null,
                'eski_bakim' => $talep['eski_bakim_aciklama'] ?? null,
                'yeni_bakim' => $talep['yeni_bakim_aciklama'] ?? null,
                'eski_kaza' => $talep['eski_kaza_aciklama'] ?? null,
                'yeni_kaza' => $talep['yeni_kaza_aciklama'] ?? null,
                'sebep' => $talep['sebep'],
                'talep_tarihi' => $talep['talep_tarihi']
            ];
            $pendingRequests[] = $req;
        }
    }
    
    echo json_encode([
        'success' => true,
        'requests' => $pendingRequests
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Ana rapor
$records = [];
$stats = [
    'total' => 0,
    'entered' => 0,
    'pending' => 0,
    'percentage' => 0
];

// Portal / atanmış araçlı kullanıcılar: en az bir araç assignedUserId ile atanmış olanlar
$tasitlar = $data['tasitlar'] ?? [];
$userIdsWithVehicle = [];
foreach ($tasitlar as $t) {
    $uid = $t['assignedUserId'] ?? null;
    if ($uid !== null && $uid !== '') {
        $userIdsWithVehicle[(string)$uid] = true;
    }
}

$surucular = [];
foreach ($data['users'] as $u) {
    $aktif = !isset($u['aktif']) || $u['aktif'] === true;
    if (!$aktif) {
        continue;
    }
    if (!isset($userIdsWithVehicle[(string)$u['id']])) {
        continue;
    }
    // Şube filtresi
    if (!empty($branch)) {
        $ubeId = $u['sube_id'] ?? $u['branchId'] ?? null;
        if ($ubeId !== null && (string)$ubeId !== (string)$branch) {
            continue;
        }
    }
    $surucular[] = $u;
}

$stats['total'] = count($surucular);

// Her kullanıcı için atanmış araçları kontrol et (assignedUserId)
foreach ($surucular as $surucu) {
    $surucuId = $surucu['id'];
    foreach ($tasitlar as $t) {
        $assignedUserId = $t['assignedUserId'] ?? null;
        if ($assignedUserId === null || (string)$assignedUserId !== (string)$surucuId) {
            continue;
        }
        $aracId = $t['id'];
        $arac = $t;

        // Bu dönem için kayıt var mı?
        $kayit = null;
        foreach ($data['arac_aylik_hareketler'] ?? [] as $k) {
            if ($k['arac_id'] === $aracId && (string)($k['surucu_id'] ?? '') === (string)$surucuId && $k['donem'] === $period) {
                $kayit = $k;
                break;
            }
        }

        $girdi = $kayit !== null;
        $bakimVar = $kayit ? ($kayit['bakim_durumu'] ?? false) : false;
        $kazaVar = $kayit ? ($kayit['kaza_durumu'] ?? false) : false;

        // Durum filtresi
        if ($status === 'girdi' && !$girdi) continue;
        if ($status === 'girmedi' && $girdi) continue;
        if ($status === 'kaza' && !$kazaVar) continue;
        if ($status === 'bakim' && !$bakimVar) continue;

        if ($girdi) {
            $stats['entered']++;
        } else {
            $stats['pending']++;
        }

        $isim = $surucu['isim'] ?? $surucu['name'] ?? '';
        $plaka = $arac['plaka'] ?? $arac['plate'] ?? '';
        $aracMarka = $arac['marka'] ?? $arac['brand'] ?? '';
        $aracModel = $arac['model'] ?? '';
        if ($aracMarka === '' && $aracModel === '' && !empty($arac['brandModel'])) {
            $aracMarka = trim($arac['brandModel']);
        }
        $km = $girdi ? ($kayit['guncel_km'] ?? null) : null;
        if ($km === null) {
            $sonDonem = null;
            foreach ($data['arac_aylik_hareketler'] ?? [] as $onceki) {
                if (isset($onceki['arac_id']) && (int)$onceki['arac_id'] === (int)$aracId && isset($onceki['guncel_km'])) {
                    $d = $onceki['donem'] ?? '';
                    if ($sonDonem === null || ($d !== '' && strcmp($d, $sonDonem) > 0)) {
                        $sonDonem = $d;
                        $km = $onceki['guncel_km'];
                    }
                }
            }
        }
        $records[] = [
            'surucu_id' => $surucuId,
            'surucu_adi' => $isim,
            'telefon' => $surucu['telefon'] ?? $surucu['phone'] ?? '',
            'plaka' => $plaka,
            'arac_marka' => $aracMarka,
            'arac_model' => $aracModel,
            'km' => $km,
            'bakim_var' => $bakimVar,
            'kaza_var' => $kazaVar,
            'girdi' => $girdi,
            'kayit_id' => $kayit ? $kayit['id'] : null,
            'donem' => $period
        ];
    }
}

// Yüzde hesapla
if ($stats['total'] > 0) {
    $stats['percentage'] = round(($stats['entered'] / $stats['total']) * 100);
}

echo json_encode([
    'success' => true,
    'stats' => $stats,
    'records' => $records
], JSON_UNESCAPED_UNICODE);
?>
