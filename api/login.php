<?php
// required headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS' ) {
    die ('OK');
}

// files needed to connect to database
include_once 'config/database.php';
include_once 'objects/user.php';
include_once 'objects/loginLog.php';

// get database connection
$database = new Database();
$db = $database->getConnection();

// instantiate user object
$user = new User($db);
$loginLog = new LoginLog($db);

// get posted data
$data = json_decode(file_get_contents("php://input"));

// set product property values
$user->email = $data->email;
// print_r($data);
$email_exists = $user->emailExists();

// generate json web token
include_once 'config/core.php';
include_once 'vendor/firebase/php-jwt/src/BeforeValidException.php';
include_once 'vendor/firebase/php-jwt/src/ExpiredException.php';
include_once 'vendor/firebase/php-jwt/src/SignatureInvalidException.php';
include_once 'vendor/firebase/php-jwt/src/JWT.php';
use \Firebase\JWT\JWT;
use Firebase\JWT\Key;

$ip = $_SERVER['REMOTE_ADDR'] ?? "not known";
$ref = $_SERVER['HTTP_REFERER'] ?? "not known";

$jwt=isset($data->jwt) ? $data->jwt : "";
if($jwt){
    try{
        $decoded = JWT::decode($jwt, new Key($key, 'HS256'));
        $renew = TRUE;
    }catch (Exception $e){
        $renew = FALSE;
    }
}else{
    $renew = FALSE;
}
// var_dump($email_exists);
// check if email exists and if password is correct
if($email_exists && (password_verify($data->password ?? "", $user->password) || $renew)){
    

    $token = array(
       "iat" => $issued_at,
       "exp" => $expiration_time,
       "iss" => $issuer,
       "data" => array(
           "id" => $user->id,
           "name" => $user->name,
           "email" => $user->email,
           "admin" => $user->admin,
           "object" => $user->object,
           "token" => $user->token,
       )
    );

    // set response code
    http_response_code(200);

    // generate jwt
    $jwt = JWT::encode($token, $key, 'HS256');
    echo json_encode(
            array(
                "message" => "Successful login.",
                "jwt" => $jwt,
                "id" => $user->id,
                "name" => $user->name,
                "email" => $user->email,
                "admin" => $user->admin,
                "object" => $user->object,
                "expiresIn" => $expiration_time,
                "token" => $user->token,
            )
        );


        $loginLog->user_id = $user->id;
        $loginLog->status = "Successful login";
        $loginLog->version = $data->version ?? "old";
        $loginLog->object = $data->object ?? new stdClass();
        $loginLog->object->ip = $ip;
        $loginLog->object->ref = $ref;

        $loginLog->create();
}

// login failed
else{

    // set response code
    http_response_code(401);
    $loginLog->user_id = $user->id;
    $loginLog->status = "Unsuccsessful login";
    $loginLog->version = $data->version ?? "old";
    $loginLog->object = $data->object ?? new stdClass();
    $loginLog->object->ip = $ip;
    $loginLog->object->ref = $ref;

    $loginLog->create();

    // tell the user login failed
    echo json_encode(array("message" => "Login failed."));
}
?>