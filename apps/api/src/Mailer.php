<?php
declare(strict_types=1);

namespace LogCalc;

/**
 * E-kirjade saatmine (PHP mail() – majutuse sendmail).
 *
 * config.php (kõik valikulised):
 *   'mail' => [
 *       'driver' => 'mail',                 // 'mail' | 'log' (kirjutab data/mail.log, arendus) | 'off'
 *       'from' => 'noreply@example.ee',     // vaikimisi noreply@<rakenduse host>
 *       'from_name' => 'LogCalc',
 *   ],
 */
final class Mailer
{
    /** @param array<string, mixed> $cfg config 'mail' osa */
    public function __construct(private readonly array $cfg, private readonly string $appUrl, private readonly string $logDir)
    {
    }

    /** true, kui kiri anti saatmiseks üle (kohaletoimetamist see ei taga) */
    public function send(string $to, string $subject, string $text): bool
    {
        $driver = (string) ($this->cfg['driver'] ?? 'mail');
        if ($driver === 'off') {
            return false;
        }
        if ($driver === 'log') {
            if (!is_dir($this->logDir)) {
                @mkdir($this->logDir, 0700, true);
            }
            $entry = '--- ' . gmdate('c') . "\nTo: $to\nSubject: $subject\n\n$text\n\n";
            return @file_put_contents($this->logDir . '/mail.log', $entry, FILE_APPEND) !== false;
        }
        $host = parse_url($this->appUrl, PHP_URL_HOST);
        $from = (string) ($this->cfg['from'] ?? ('noreply@' . (is_string($host) && $host !== '' ? $host : 'localhost')));
        $fromName = (string) ($this->cfg['from_name'] ?? 'LogCalc');
        if (!filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $headers = [
            'From: ' . self::encode($fromName) . ' <' . $from . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        try {
            return @mail($to, self::encode($subject), str_replace("\n", "\r\n", $text), implode("\r\n", $headers), '-f' . $from);
        } catch (\Throwable $e) {
            error_log('[logcalc-api] mail: ' . $e->getMessage());
            return false;
        }
    }

    private static function encode(string $s): string
    {
        return preg_match('/[^\x20-\x7e]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
    }
}
