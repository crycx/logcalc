<?php
declare(strict_types=1);

namespace LogCalc;

use LogCalc\Api\AuthApi;
use LogCalc\Api\ProjectsApi;
use LogCalc\Api\TenantApi;
use LogCalc\Api\UsersApi;

final class App
{
    public static function run(): never
    {
        $cfg = [];
        try {
            try {
                $cfg = logcalc_config();
            } catch (\RuntimeException) {
                throw new HttpException(503, 'API seadistus (config.php) puudub.');
            }
            $req = Request::fromGlobals((string) ($cfg['base_path'] ?? '/api'));
            self::guardCsrf($req, $cfg);

            $db = Db::connect($cfg['db']);
            $auth = new Auth($db, $cfg['session'] ?? [], AuthLog::fromRequest($db, $req, (int) ($cfg['auth_log_days'] ?? 365)));
            $auth->startSession();

            $tokens = new PasswordTokens($db);
            // rakenduse aadress e-kirja linkide jaoks: config app_url, muidu päringu Origin (CSRF kontrollitud), muidu esimene lubatud
            $appUrl = (string) ($cfg['app_url'] ?? $req->header('origin') ?? ((array) ($cfg['allowed_origins'] ?? []))[0] ?? '');
            $mailer = new Mailer((array) ($cfg['mail'] ?? []), $appUrl, LOGCALC_APP_ROOT . '/data');
            $authApi = new AuthApi($db, $auth, $tokens);
            $projects = new ProjectsApi($db, $auth);
            $tenant = new TenantApi($db, $auth);
            $users = new UsersApi($db, $auth, $tokens, $mailer, $appUrl);

            /** @var list<array{0: string, 1: string, 2: callable}> $routes */
            $routes = [
                ['GET', '/health', static fn () => ['ok' => true, 'time' => gmdate('c')]],
                ['GET', '/auth/me', $authApi->me(...)],
                ['POST', '/auth/login', $authApi->login(...)],
                ['POST', '/auth/logout', $authApi->logout(...)],
                ['POST', '/auth/password', $authApi->changePassword(...)],
                ['GET', '/auth/events', $authApi->myEvents(...)],
                ['POST', '/auth/link', $authApi->linkInfo(...)],
                ['POST', '/auth/link/password', $authApi->linkSetPassword(...)],
                ['GET', '/projects', $projects->list(...)],
                ['POST', '/projects', $projects->create(...)],
                ['GET', '/projects/{id}', $projects->get(...)],
                ['PUT', '/projects/{id}', $projects->update(...)],
                ['DELETE', '/projects/{id}', $projects->delete(...)],
                ['GET', '/projects/{id}/shares', $projects->shares(...)],
                ['POST', '/projects/{id}/shares', $projects->addShare(...)],
                ['DELETE', '/projects/{id}/shares/{userId}', $projects->removeShare(...)],
                ['GET', '/tenant', $tenant->get(...)],
                ['PUT', '/tenant/settings', $tenant->updateSettings(...)],
                ['GET', '/tenants', $tenant->listAll(...)],
                ['POST', '/tenants', $tenant->create(...)],
                ['GET', '/users', $users->list(...)],
                ['POST', '/users', $users->create(...)],
                ['PATCH', '/users/{id}', $users->update(...)],
                ['POST', '/users/{id}/invite', $users->invite(...)],
                ['GET', '/auth-events', $users->events(...)],
            ];

            $pathMatched = false;
            foreach ($routes as [$method, $pattern, $handler]) {
                $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $pattern) . '$#';
                if (!preg_match($regex, $req->path, $m)) {
                    continue;
                }
                $pathMatched = true;
                if ($method !== $req->method) {
                    continue;
                }
                $params = array_map('intval', array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY));
                $result = $handler($req, $params);
                Response::json($result, $req->method === 'POST' && $pattern !== '/auth/login' && !str_starts_with($pattern, '/auth/') ? 201 : 200);
            }
            throw new HttpException($pathMatched ? 405 : 404, $pathMatched ? 'Meetod pole lubatud.' : 'Ei leitud.');
        } catch (HttpException $e) {
            Response::json(['error' => $e->getMessage()], $e->status);
        } catch (\Throwable $e) {
            error_log('[logcalc-api] ' . $e);
            $body = ['error' => 'Serveri viga.'];
            if (!empty($cfg['debug'])) {
                $body['debug'] = $e->getMessage();
            }
            Response::json($body, 500);
        }
    }

    /**
     * CSRF: muutvad päringud peavad sisaldama X-Requested-With: logcalc päist
     * (seda ei saa teiselt saidilt ilma CORS-i loata saata) ja Origin peab olema lubatud.
     *
     * @param array<string, mixed> $cfg
     */
    private static function guardCsrf(Request $req, array $cfg): void
    {
        if (in_array($req->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        if ($req->header('x-requested-with') !== 'logcalc') {
            throw new HttpException(403, 'Keelatud päring.');
        }
        $origin = $req->header('origin');
        $allowed = (array) ($cfg['allowed_origins'] ?? []);
        if ($origin !== null && $origin !== '' && !in_array($origin, $allowed, true)) {
            throw new HttpException(403, 'Keelatud päritolu.');
        }
    }
}
