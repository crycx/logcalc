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
 
// if jwt is not empty
if($jwt || $data->hash){
 
    // if decode succeed, show user details
  
    try{

        !isset($data->hash) ? $decoded = JWT::decode($jwt, new Key($key, 'HS256')) : NULL;
    
        // set user property values
    
        $data->password ? $user->password = $data->password : $user->password = NULL;
        $data->hash ? $user->token = $data->hash : $user->token = NULL;
        $user->id = $data->id;
        
        if($user->check_hash()){
            if($user->update_password()){
        
                // set response code
                http_response_code(200);
                
                // response in json format
                echo json_encode(
                        array(
                            "message" => "User password was updated.",
                            "id" => $user->id,
                        )
                    );
            }
            // update the user record
            
            // message if unable to update user
            else{
                // set response code
                http_response_code(401);
            
                // show error message
                echo json_encode(array("message" => "Unable to update user."));
            }
    
        }else{
            http_response_code(401);
            echo json_encode(array("message" => "Invalid hash"));
        }
    }
        // decode jwt
    
 
// if decode fails, it means jwt is invalid
  
catch (Exception $e){
    
    // set response code
    http_response_code(401);

    // show error message
    echo json_encode(array(
        "message" => "Access denied.",
        "error" => $e->getMessage()
    ));
}
}
 
// show error message if jwt is empty
else{
 
    // set response code
    http_response_code(401);
 
    // tell the user access denied
    echo json_encode(array("message" => "Access denied."));
}
?>