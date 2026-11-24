<?php
// required headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Set-Cookie: key=value; path=/; domain=teed.ee; HttpOnly; Secure; SameSite=Strict");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS' ) {
    die ('OK');
}
 
// required to encode json web token
include_once 'config/core.php';
include_once 'vendor/firebase/php-jwt/src/BeforeValidException.php';
include_once 'vendor/firebase/php-jwt/src/ExpiredException.php';
include_once 'vendor/firebase/php-jwt/src/SignatureInvalidException.php';
include_once 'vendor/firebase/php-jwt/src/JWT.php';
use \Firebase\JWT\JWT;
use Firebase\JWT\Key;
// files needed to connect to database
include_once 'config/database.php';
include_once 'objects/user.php';
 
// get database connection
$database = new Database();
$db = $database->getConnection();
 
// instantiate user object
$user = new User($db);
 
// get posted data
$data = json_decode(file_get_contents("php://input"));
 
// get jwt
$jwt=isset($data->jwt) ? $data->jwt : "";
$user->token = isset($data->hash) ? $data->hash : NULL;
$hashUser = $user->check_hash();
if($hashUser = $user->check_hash()){
    $userO = $hashUser;
    $response = "User found";
}else{
    $userO = null;
    $response = "Hash incorrect";
}
 
// if jwt is not empty
if($userO){
    
    if(!empty($user)){
        echo json_encode(array("ts"=> time(), "user"=>$userO ? $userO[0] : NULL, "response" => $response));
    }else{
        echo json_encode(NULL);
    }

 
// if decode fails, it means jwt is invalid
}
 
// show error message if jwt is empty
else{
 
    // set response code
    http_response_code(200);
 
    // tell the user access denied
    echo json_encode(array("response" => $response));
}
?>