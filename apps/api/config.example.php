<?php
/**
 * LogCalc API seadistus. Kopeeri -> config.php (EI LÄHE GITTI).
 * Serveris: ~/logcalc-api/config.php (väljaspool veebijuurt).
 */
return [
    // --- Andmebaas ---
    // MySQL / MariaDB:
    'db' => [
        'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=ANDMEBAASI_NIMI;charset=utf8mb4',
        'user' => 'KASUTAJA',
        'pass' => 'PAROOL',
    ],
    // SQLite (kohalik arendus / test):
    // 'db' => ['dsn' => 'sqlite:' . __DIR__ . '/data/logcalc.sqlite'],

    // --- Seanss ---
    'session' => [
        'name' => 'LCSESS',
        'path' => __DIR__ . '/data/sessions',
        'secure' => true,            // kohalikul http-l: false
        'lifetime' => 60 * 60 * 24 * 14,
    ],

    // URL-i eesliide, mille all API töötab
    'base_path' => '/api',

    // Lubatud Origin päised muutvatele päringutele (CSRF)
    'allowed_origins' => [
        'https://uuslogcalc.sinpal.ee',
    ],

    // Rakenduse aadress e-kirjade linkide jaoks (parooli määramine). Puudumisel päringu Origin / esimene lubatud.
    // 'app_url' => 'https://uuslogcalc.sinpal.ee',

    // E-kirjad (kutse ja uue parooli link): PHP mail(). Puudumisel From: noreply@<rakenduse host>.
    // 'driver' => 'log' kirjutab kirjad faili data/mail.log (arendus), 'off' ei saada (link kuvatakse ainult adminile).
    // 'mail' => ['from' => 'noreply@sinpal.ee', 'from_name' => 'LogCalc'],

    // Sisselogimiste logi (IP, brauser) säilitusaeg päevades; 0 = ei kustutata
    'auth_log_days' => 365,

    'debug' => false,
];
