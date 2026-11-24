<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\Request;
use PDO;

final class AuthApi
{
    public function __construct(private readonly PDO $db, private readonly Auth $auth)
    {
    }

    public function me(Request $req): array
    {
        $u = $this->auth->user();
        return ['user' => $u ? Auth::publicUser($u) : null];
    }

    public function login(Request $req): array
    {
        $d = $req->json();
        $email = Input::email($d);
        $password = $d['password'] ?? null;
        if (!is_string($password) || $password === '') {
            throw new HttpException(422, 'Parool on kohustuslik.');
        }
        $u = $this->auth->login($email, $password, $req->ip);
        return ['user' => Auth::publicUser($u)];
    }

    public function logout(Request $req): array
    {
        $this->auth->logout();
        return ['ok' => true];
    }

    public function changePassword(Request $req): array
    {
        $u = $this->auth->requireUser();
        $d = $req->json();
        $current = $d['current'] ?? '';
        $new = $d['new'] ?? '';
        if (!is_string($current) || !is_string($new)) {
            throw new HttpException(422, 'Vigased andmed.');
        }
        if (!$this->auth->verifyPassword($u['id'], $current)) {
            throw new HttpException(403, 'Praegune parool on vale.');
        }
        $this->auth->setPassword($u['id'], $new);
        return ['ok' => true];
    }
}
