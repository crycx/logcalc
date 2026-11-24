<?php
declare(strict_types=1);

namespace LogCalc;

final class HttpException extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

final class Request
{
    private const MAX_BODY = 1_048_576; // 1 MB

    /** @param array<string, string> $headers */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        private readonly string $rawBody,
        private readonly array $headers,
        public readonly string $ip,
    ) {
    }

    public static function fromGlobals(string $basePath): self
    {
        $uri = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if ($basePath !== '' && str_starts_with($uri, $basePath)) {
            $uri = substr($uri, strlen($basePath));
        }
        $path = '/' . trim($uri, '/');

        $headers = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($k, 5)))] = (string) $v;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path,
            (string) file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1),
            $headers,
            (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        );
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        if (strlen($this->rawBody) > self::MAX_BODY) {
            throw new HttpException(413, 'Päring on liiga suur.');
        }
        if (trim($this->rawBody) === '') {
            return [];
        }
        try {
            $data = json_decode($this->rawBody, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpException(400, 'Vigane JSON.');
        }
        if (!is_array($data)) {
            throw new HttpException(400, 'Oodati JSON objekti.');
        }
        return $data;
    }
}

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }
}

/** Sisendi abifunktsioonid */
final class Input
{
    /** @param array<string, mixed> $d */
    public static function str(array $d, string $key, int $max = 200, bool $required = true): ?string
    {
        $v = $d[$key] ?? null;
        if ($v === null || $v === '') {
            if ($required) {
                throw new HttpException(422, "Väli '$key' on kohustuslik.");
            }
            return null;
        }
        if (!is_string($v)) {
            throw new HttpException(422, "Väli '$key' peab olema tekst.");
        }
        $v = trim($v);
        if (mb_strlen($v) > $max) {
            throw new HttpException(422, "Väli '$key' on liiga pikk (max $max).");
        }
        return $v;
    }

    /** @param array<string, mixed> $d */
    public static function email(array $d, string $key = 'email'): string
    {
        $v = self::str($d, $key, 254);
        if (filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            throw new HttpException(422, 'Vigane e-posti aadress.');
        }
        return mb_strtolower((string) $v);
    }
}
