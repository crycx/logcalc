<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\PasswordTokens;
use LogCalc\Request;
use PDO;

final class AuthApi
{
    public function __construct(private readonly PDO $db, private readonly Auth $auth, private readonly PasswordTokens $tokens)
    {
    }

    /** Parooli lingi kontroll (avalik): kellele link on ja kas see kehtib */
    public function linkInfo(Request $req): array
    {
        $t = $this->link($req->json());
        return ['email' => $t['email'], 'name' => $t['name'], 'tenant' => $t['tenant_name'], 'purpose' => $t['purpose'], 'expiresAt' => $t['expires_at']];
    }

    /** Parooli määramine lingiga (avalik): parool salvestatakse, link kaotab kehtivuse, kasutaja logitakse sisse */
    public function linkSetPassword(Request $req): array
    {
        $d = $req->json();
        $t = $this->link($d);
        $password = $d['password'] ?? null;
        if (!is_string($password)) {
            throw new HttpException(422, 'Parool on kohustuslik.');
        }
        $uid = (int) $t['user_id'];
        $this->auth->setPassword($uid, $password);
        $this->tokens->consume((int) $t['id']);
        $this->auth->log()->record('password_set', $uid, (int) $t['tenant_id'], (string) $t['email'], $uid, $t['purpose'] === 'invite' ? 'kutse lingiga' : 'uue parooli lingiga');
        $u = $this->auth->loginAfterPasswordSet($uid);
        return ['user' => Auth::publicUser($u)];
    }

    /** @return array<string, mixed> */
    private function link(array $d): array
    {
        $token = $d['token'] ?? null;
        $t = is_string($token) ? $this->tokens->find($token) : null;
        return $t ?? throw new HttpException(410, 'Link on aegunud või juba kasutatud. Palu adminil saata uus link.');
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
        $this->auth->log()->record('password_changed', $u['id'], $u['tenant_id'], (string) $u['email'], $u['id']);
        return ['ok' => true];
    }

    /** Minu viimased sisselogimised ja kontosündmused */
    public function myEvents(Request $req): array
    {
        $u = $this->auth->requireUser();
        $limit = min(max($req->queryInt('limit', 50) ?? 50, 1), 200);
        $st = $this->db->prepare(
            'SELECT id, type, ip, user_agent, detail, at FROM auth_events WHERE user_id = ? ORDER BY at DESC, id DESC LIMIT ' . $limit
        );
        $st->execute([$u['id']]);
        return ['events' => array_map(static fn (array $r) => [
            'id' => (int) $r['id'],
            'type' => $r['type'],
            'at' => $r['at'],
            'ip' => $r['ip'],
            'userAgent' => $r['user_agent'],
            'detail' => $r['detail'],
        ], $st->fetchAll())];
    }
}
