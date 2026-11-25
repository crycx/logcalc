<?php
declare(strict_types=1);

namespace LogCalc;

/**
 * E-kirjade saatmine (PHP mail() – majutuse sendmail).
 *
 * config.php (kõik valikulised):
 *   'mail' => [
 *       'driver' => 'mail',                 // 'mail' | 'log' (kirjutab data/mail.log, arendus) | 'off'
 *       'from' => 'noreply@example.ee',     // vaikimisi noreply@<rakenduse põhidomeen> (uuslogcalc.sinpal.ee -> sinpal.ee,
 *                                           // et domeeni SPF kehtiks; alamdomeenil kirjaseadistust pole)
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
    public function send(string $to, string $subject, string $text, ?string $replyTo = null): bool
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
        $from = (string) ($this->cfg['from'] ?? ('noreply@' . self::baseDomain($this->appUrl)));
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
        // vastus kutse saatnud adminile (mitte noreply aadressile)
        if ($replyTo !== null && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }
        try {
            return @mail($to, self::encode($subject), str_replace("\n", "\r\n", $text), implode("\r\n", $headers), '-f' . $from);
        } catch (\Throwable $e) {
            error_log('[logcalc-api] mail: ' . $e->getMessage());
            return false;
        }
    }

    /** Rakenduse aadressi põhidomeen: uuslogcalc.sinpal.ee -> sinpal.ee (kahetasemeline jääb samaks) */
    private static function baseDomain(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '' || filter_var($host, FILTER_VALIDATE_IP)) {
            return 'localhost';
        }
        $parts = explode('.', $host);
        return count($parts) > 2 ? implode('.', array_slice($parts, -2)) : $host;
    }

    private static function encode(string $s): string
    {
        return preg_match('/[^\x20-\x7e]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
    }
}
