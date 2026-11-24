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
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
// files needed to connect to database
include_once 'config/database.php';
include_once 'objects/sadul.php';
include_once 'objects/yhekaldeline.php';
include_once 'objects/hinnad.php';


 
// get database connection
$database = new Database();
$db = $database->getConnection();
 
// instantiate user object
// $user = new User($db);
$sadul = new SadulKatus($db);
$kaldu = new KalduKatus($db);
$hinnad = new Hinnad($db);

 
// get posted data
$data = json_decode(file_get_contents("php://input"));
 
// get jwt
// $jwt=isset($data->jwt) ? $data->jwt : "";
// $authKey = isset($data->authKey) ? $data->authKey : NULL;
 
// if jwt is not empty
if(/* $jwt ||  */true ){
 
    // if decode succeed, show user details
    try {
 
        // decode jwt
        // $decoded = JWT::decode($jwt, new Key($key, 'HS256'));

        switch ($data->kind) {
            case 'user':
                if($data->op == "create"){
                    $user->name = $data->name;
                    $user->email = $data->email;
                
                    $user->admin = isset($data->admin) ? $data->admin : FALSE;
                    $user->password = isset($data->password) ? $data->password : NULL;
                    $user->object = isset($data->object) ? $data->object : NULL;
                    $hash = md5(json_encode($user) . "," . time());
                    $user->token = $hash;
               
                    // echo json_encode($data);                
                    
                    // create the user
                    if(
                    !empty($user->name)&&
                    !empty($user->email)&&
                    !$user->emailExists()&&
                    $stmt = $user->create()
                    )
                    {
                        if(!isset($data->password)){
                            $response = "User created, set password!";
                            $link = !$data->dev ? "https://dev.teder.ee/new-password/". $hash : "http://localhost:7890/new-password/". $hash;
                            $emails->subject = "Set new user password";
                            $emails->toAddress = [$user->email];
                            $emails->htmlBody = 'Set your new password here: <a href="' . $link .  '">'  . $link . '</a>';
                            $emails->textBody = NULL;
                            $emails->attachment = NULL;
                            
                            if($emails->sendMail()){
                        
                                // display message: user was created
                                $emailRes = (array(
                                    "message" => "Email sent.",
                                    "to" => $emails->toAddress,
                                    "subject" => $emails->subject,
                                    "jwt" => $decoded
                                    // "user_id" => $email->user_id,
                                    // "ticket" => $email->ticket,
                                ));
                         
                            // set response code
                                http_response_code(200);
                         
                            // display message: user was created
                                echo json_encode(array("message" => "User was created.", "id"=>$db->lastInsertId(), "hash"=>$user->token, "emailRes"=>$emailRes));
                            }else{
                                                
                                // display message: unable to create user
                                echo json_encode(array("\n message" => "Email sending error."));
                            }
                    
                        }else{
                            
                            http_response_code(200);
                            echo json_encode(array("message"=>"Create user successful", "id"=>$db->lastInsertId(), "hash"=>$user->token, "debug"=> $database->pdo_debugStrParams($stmt)));

                        }
                    }                  
                    // message if unable to create user
                    else{
                        // set response code
                        http_response_code(400);
                        // display message: unable to create user
                        echo json_encode(array("message" => "Unable to create user." , "emailExists" => $user->emailExists()));
                    }
                }else
                if($data->op == "update"){
                    $user->name = isset($data->name) ? $data->name : NULL;
                    $user->email = isset($data->email) ? $data->email : NULL;
                    $user->admin = isset($data->admin) ? $data->admin : FALSE;
                    $user->password = isset($data->password) ? $data->password : NULL;
                    $user->object = isset($data->object) ? $data->object : NULL;
                    $user->id = isset($data->id) ? $data->id : NULL;

                    if(!empty($user->id)&&
                    $stmt= $user->update()){ 
                        http_response_code(200);
                        echo json_encode(array("message"=>"User updated", "id"=>$user->id, "debug"=> $database->pdo_debugStrParams($stmt)));
                    }                  
                    // message if unable to create user
                    else{
                        // set response code
                        http_response_code(400);
                        // display message: unable to create user
                        echo json_encode(array("message" => "Unable to update user."));
                    }
                    
                }else
                if($data->op == "delete"){
                    $user->id = $data->id;
    
                    // update the user record
                    if($user->delete()){
                        // user Delete successful
                        
                        // set response code
                        http_response_code(200);
                        
                        // response in json format
                        echo json_encode(
                                array(
                                    "message" => "User was deleted.",
                                    "id" => $user->id
                                )
                            );
                    }
                    
                    // message if unable to update user
                    else{
                        // set response code
                        http_response_code(401);
                    
                        // show error message
                        echo json_encode(array("message" => "Unable to delete user."));
                    }

                }else
                if($data->op == "check_user"){
                    echo json_encode(array("userObject"=> $decoded));  
                }else if($data->op == "saveUserObject"){
                    $user->id = $data->id;
                    $user->object = $data->object;
                    if($stmt = $user->editUserObject()){
                        http_response_code(200);
                        echo json_encode(array("message"=>"Object updated", "id"=>$user->id, "debug"=> $database->pdo_debugStrParams($stmt)));
                    }                  
                    // message if unable to create user
                    else{
                        // set response code
                        http_response_code(400);
                        // display message: unable to create user
                        echo json_encode(array("message" => "Unable to update user."));
                    }

                }else if($data->op == "getUserObject"){
                    $user->id = $data->id;
                    if($stmt = $user->getUserObject()){
                        $num = $stmt->rowCount();
                        $user_arr = null;
                        if($num > 0){
                            $user_arr = array();
                            $user_arr["records"] = array();
                            while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                extract($row);
                                // var_dump($row);
                                $user_item = array(
                                    "object" => json_decode($object ?? ""),
                                );

                                array_push($user_arr["records"], $user_item);
                            }
                        }

                        http_response_code(200);
                        
                        // response in json format
                        echo json_encode($user_arr);
                    }                  
                    // message if unable to create user
                    else{
                        // set response code
                        http_response_code(400);
                        // display message: unable to create user
                        echo json_encode(array("message" => "Unable to update user."));
                    }
                }else {
                    // echo "Get users: \n";
                    $user->idArray = $data->idArray;
                    $user->filters = $data->filters;
                    
                    // update the user record
                    if($stmt = $user->getUsers()){
                        // regenerate jwt will be here
                        // we need to re-generate jwt because user details might be different        
                        // set response code
                        $num = $stmt->rowCount();
                        $user_arr = null;
                        if($num > 0){
                            $user_arr = array();
                            $user_arr["records"] = array();
                            while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                extract($row);
                                // var_dump($row);
                                $user_item = array(
                                    "id" => $id,
                                    "email" => $email,
                                    "name" => $name,
                                    "admin" => $admin,
                                    "object" => json_decode($object ?? ""),
                                    "created" => $created,
                                    "modified" => $modified,
                                );

                                array_push($user_arr["records"], $user_item);
                            }
                        }

                        http_response_code(200);
                        
                        // response in json format
                        echo json_encode($user_arr);
                    }
                    
                    // message if unable to update user
                    else{
                        // set response code
                        http_response_code(401);
                    
                        // show error message
                        echo json_encode(array("message" => "Unable to get user data."));
                    }
                }
                break;
            case 'sadul':
                    if($data->op == "create"){
                        $sadul->majaNimi = $data->majaNimi;
                        $sadul->laius = $data->laius;
                        $sadul->pikkus = $data->pikkus;
                        $sadul->kyljeseinaKorgus = $data->kyljeseinaKorgus;
                        $sadul->esiTagaKorgus = $data->esiTagaKorgus;
                        $sadul->katusKorgus = $data->katusKorgus;
                        $sadul->palgiPaksus = $data->palgiPaksus;
                        $sadul->palgiKorgus = $data->palgiKorgus;
                        $sadul->pikemadLauad = $data->pikemadLauad;
                        $sadul->uksed = $data->uksed;
                        $sadul->aknad = $data->aknad;
                        $sadul->vundament = $data->vundament;
                        $sadul->porandalauad = $data->porandalauad;
                        $sadul->parlin = $data->parlin;
                        $sadul->katus = $data->katus;
                

                   
                        // echo json_encode($data);                
                        
                        // create the user
                        if(
                        !empty($sadul->majaNimi)&&
                        $stmt = $sadul->create()
                        )
                        {

                                
                                http_response_code(200);
                                echo json_encode(array("message"=>"Create sadul successful", "id"=>$db->lastInsertId(), "debug"=> $database->pdo_debugStrParams($stmt)));
    
                            
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to create nordpool." ));
                        }
                    }else
                    if($data->op == "update"){
                        $sadul->majaNimi = $data->majaNimi;
                        $sadul->laius = $data->laius;
                        $sadul->pikkus = $data->pikkus;
                        $sadul->kyljeseinaKorgus = $data->kyljeseinaKorgus;
                        $sadul->esiTagaKorgus = $data->esiTagaKorgus;
                        $sadul->katusKorgus = $data->katusKorgus;
                        $sadul->palgiPaksus = $data->palgiPaksus;
                        $sadul->palgiKorgus = $data->palgiKorgus;
                        $sadul->pikemadLauad = $data->pikemadLauad;
                        $sadul->uksed = $data->uksed;
                        $sadul->aknad = $data->aknad;
                        $sadul->vundament = $data->vundament;
                        $sadul->porandalauad = $data->porandalauad;
                        $sadul->parlin = $data->parlin;
                        $sadul->katus = $data->katus;

                        $sadul->id = isset($data->id) ? $data->id : NULL;
    
                        if(!empty($sadul->id)&&
                        $stmt= $sadul->update()){ 
                            http_response_code(200);
                            echo json_encode(array("message"=>"Sadul updated", "id"=>$sadul->id, "debug"=> $database->pdo_debugStrParams($stmt)));
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to update user."));
                        }
                        
                    }else
                    if($data->op == "delete"){
                        $sadul->id = $data->id;
        
                        // update the user record
                        if($sadul->delete()){
                            // user Delete successful
                            
                            // set response code
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode(
                                    array(
                                        "message" => "Sadul was deleted.",
                                        "id" => $sadul->id
                                    )
                                );
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to delete sadul."));
                        }
    
                    }else {
                        // echo "Get users: \n";
                        $sadul->idArray = $data->idArray;
                        $sadul->filters = $data->filters;
                        
                        // update the user record
                        if($stmt = $sadul->getSadul()){
                            // regenerate jwt will be here
                            // we need to re-generate jwt because user details might be different        
                            // set response code
                            $num = $stmt->rowCount();
                            $sadul_arr = null;
                            if($num > 0){
                                $sadul_arr = array();
                                $sadul_arr["records"] = array();
                                while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                    extract($row);
                                    // var_dump($row);
                                    $sadul_item = array(
                                        "id" => $id,
                                        "majaNimi" => $majaNimi,
                                        "laius" => $laius,
                                        "pikkus" => $pikkus,
                                        "kyljeseinaKorgus" => $kyljeseinaKorgus,
                                        "esiTagaKorgus" => $esiTagaKorgus,
                                        "katusKorgus" => $katusKorgus,
                                        "palgiPaksus" => $palgiPaksus,
                                        "palgiKorgus" => $palgiKorgus,
                                        "pikemadLauad" => json_decode($pikemadLauad ?? ""),
                                        "uksed" => json_decode($uksed ?? ""),
                                        "aknad" => json_decode($aknad ?? ""),
                                        "vundament" => json_decode($vundament ?? ""),
                                        "porandalauad" => json_decode($porandalauad ?? ""),
                                        "parlin" => json_decode($parlin ?? ""),
                                        "katus" => json_decode($katus ?? ""),
                                    );
    
                                    array_push($sadul_arr["records"], $sadul_item);
                                }
                            }
    
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode($sadul_arr);
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to get sadul data."));
                        }
                    }
                    break;
            case 'kaldeline':
                    if($data->op == "create"){
                        $kaldu->majaNimi = $data->majaNimi;
                        $kaldu->laius = $data->laius;
                        $kaldu->pikkus = $data->pikkus;
                        $kaldu->esiseinaKorgus = $data->esiseinaKorgus;
                        $kaldu->tagaseinaKorgus = $data->tagaseinaKorgus;
                        $kaldu->palgiPaksus = $data->palgiPaksus;
                        $kaldu->palgiKorgus = $data->palgiKorgus;
                        $kaldu->pikemadLauad = $data->pikemadLauad;
                        $kaldu->uksed = $data->uksed;
                        $kaldu->aknad = $data->aknad;
                        $kaldu->vundament = $data->vundament;
                        $kaldu->porandalauad = $data->porandalauad;
                        $kaldu->parlin = $data->parlin;
                        $kaldu->katus = $data->katus;
                

                   
                        // echo json_encode($data);                
                        
                        // create the user
                        if(
                        !empty($kaldu->majaNimi)&&
                        $stmt = $kaldu->create()
                        )
                        {

                                
                                http_response_code(200);
                                echo json_encode(array("message"=>"Create kaldu successful", "id"=>$db->lastInsertId(), "debug"=> $database->pdo_debugStrParams($stmt)));
    
                            
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to create kaldu." ));
                        }
                    }else
                    if($data->op == "update"){
                        $kaldu->majaNimi = $data->majaNimi;
                        $kaldu->laius = $data->laius;
                        $kaldu->pikkus = $data->pikkus;
                        $kaldu->esiseinaKorgus = $data->esiseinaKorgus;
                        $kaldu->tagaseinaKorgus = $data->tagaseinaKorgus;
                        $kaldu->palgiPaksus = $data->palgiPaksus;
                        $kaldu->palgiKorgus = $data->palgiKorgus;
                        $kaldu->pikemadLauad = $data->pikemadLauad;
                        $kaldu->uksed = $data->uksed;
                        $kaldu->aknad = $data->aknad;
                        $kaldu->vundament = $data->vundament;
                        $kaldu->porandalauad = $data->porandalauad;
                        $kaldu->parlin = $data->parlin;
                        $kaldu->katus = $data->katus;

                        $kaldu->id = isset($data->id) ? $data->id : NULL;
    
                        if(!empty($kaldu->id)&&
                        $stmt= $kaldu->update()){ 
                            http_response_code(200);
                            echo json_encode(array("message"=>"Kaldu updated", "id"=>$kaldu->id, "debug"=> $database->pdo_debugStrParams($stmt)));
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to update kaldu."));
                        }
                        
                    }else
                    if($data->op == "delete"){
                        $kaldu->id = $data->id;
        
                        // update the user record
                        if($kaldu->delete()){
                            // user Delete successful
                            
                            // set response code
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode(
                                    array(
                                        "message" => "Kaldu was deleted.",
                                        "id" => $kaldu->id
                                    )
                                );
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to delete kaldu."));
                        }
    
                    }else {
                        // echo "Get users: \n";
                        $kaldu->idArray = $data->idArray;
                        $kaldu->filters = $data->filters;
                        
                        // update the user record
                        if($stmt = $kaldu->getKaldu()){
                            // regenerate jwt will be here
                            // we need to re-generate jwt because user details might be different        
                            // set response code
                            $num = $stmt->rowCount();
                            $kaldu_arr = null;
                            if($num > 0){
                                $kaldu_arr = array();
                                $kaldu_arr["records"] = array();
                                while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                    extract($row);
                                    // var_dump($row);
                                    $kaldu_item = array(
                                        "id" => $id,
                                        "majaNimi" => $majaNimi,
                                        "laius" => $laius,
                                        "pikkus" => $pikkus,
                                        "esiseinaKorgus" => $esiseinaKorgus,
                                        "tagaseinaKorgus" => $tagaseinaKorgus,
                                        "palgiPaksus" => $palgiPaksus,
                                        "palgiKorgus" => $palgiKorgus,
                                        "pikemadLauad" => json_decode($pikemadLauad ?? ""),
                                        "uksed" => json_decode($uksed ?? ""),
                                        "aknad" => json_decode($aknad ?? ""),
                                        "vundament" => json_decode($vundament ?? ""),
                                        "porandalauad" => json_decode($porandalauad ?? ""),
                                        "parlin" => json_decode($parlin ?? ""),
                                        "katus" => json_decode($katus ?? ""),
                                    );
    
                                    array_push($kaldu_arr["records"], $kaldu_item);
                                }
                            }
    
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode($kaldu_arr);
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to get kaldu data."));
                        }
                    }
                    break;
            case 'hinnad':
                    if($data->op == "create"){
                        $hinnad->nimi = $data->nimi;               
                        $hinnad->hinnad = $data->hinnad;

                   
                        // echo json_encode($data);                
                        
                        // create the user
                        if(
                        !empty($hinnad->nimi)&&
                        !empty($hinnad->hinnad)&&
                        $stmt = $hinnad->create()
                        )
                        {

                                
                                http_response_code(200);
                                echo json_encode(array("message"=>"Create hind successful", "id"=>$db->lastInsertId(), "debug"=> $database->pdo_debugStrParams($stmt)));
    
                            
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to create hind." ));
                        }
                    }else
                    if($data->op == "update"){
                        $hinnad->nimi = $data->nimi;               
                        $hinnad->hinnad = $data->hinnad;

                        $hinnad->id = isset($data->id) ? $data->id : NULL;
    
                        if(!empty($hinnad->id)&&
                        $stmt= $hinnad->update()){ 
                            http_response_code(200);
                            echo json_encode(array("message"=>"Hind updated", "id"=>$hinnad->id, "debug"=> $database->pdo_debugStrParams($stmt)));
                        }                  
                        // message if unable to create user
                        else{
                            // set response code
                            http_response_code(400);
                            // display message: unable to create user
                            echo json_encode(array("message" => "Unable to update hind."));
                        }
                        
                    }else
                    if($data->op == "delete"){
                        $hinnad->id = $data->id;
        
                        // update the user record
                        if($hinnad->delete()){
                            // user Delete successful
                            
                            // set response code
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode(
                                    array(
                                        "message" => "Hind was deleted.",
                                        "id" => $hinnad->id
                                    )
                                );
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to delete sadul."));
                        }
    
                    }else {
                        // echo "Get users: \n";
                        $hinnad->idArray = $data->idArray;
                        $hinnad->filters = $data->filters;
                        
                        // update the user record
                        if($stmt = $hinnad->getHinnad()){
                            // regenerate jwt will be here
                            // we need to re-generate jwt because user details might be different        
                            // set response code
                            $num = $stmt->rowCount();
                            $hinnad_arr = null;
                            if($num > 0){
                                $hinnad_arr = array();
                                $hinnad_arr["records"] = array();
                                while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                    extract($row);
                                    // var_dump($row);
                                    $hinnad_item = array(
                                        "id" => $id,
                                        "nimi" => $nimi,
                                        "hinnad" => json_decode($hinnad ?? ""),
                                    );
    
                                    array_push($hinnad_arr["records"], $hinnad_item);
                                }
                            }
    
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode($hinnad_arr);
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to get sadul data."));
                        }
                    }
                    break;

                if($data->op == "get"){
                    // echo "Get users: \n";
                    $holidays->idArray = $data->idArray;
                    $holidays->filters = $data->filters;
                    $holidays->currentUx = $data->currentUx;
                    
                    // update the user record
                    if($stmt = $holidays->getHolidays()){
                        // regenerate jwt will be here
                        // we need to re-generate jwt because user details might be different        
                        // set response code
                        $num = $stmt->rowCount();
                        $holidays_arr = null;
                        if($num > 0){
                            $holidays_arr = array();
                            $holidays_arr["records"] = array();
                            while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                extract($row);
                                // var_dump($row);
                                $holidays_item = array(
                                    "id" => $id,
                                    "startTS" => $startTS,
                                    "endTS" => $endTS,
                                    "name" => $name,
                                );

                                array_push($holidays_arr["records"], $holidays_item);
                            }
                        }

                        http_response_code(200);
                        
                        // response in json format
                        echo json_encode($holidays_arr);
                    }
                    
                    // message if unable to update user
                    else{
                        // set response code
                        http_response_code(401);
                    
                        // show error message
                        echo json_encode(array("message" => "Unable to get user data."));
                    }
                }
                break;   
            case 'emails':
                if($data->op == "sendEmail"){

                    $emails->subject = $data->subject ?? NULL;
                    $emails->toAddress = $data->toAddress;
                    // $emails->fromName = $data->fromName ?? NULL;
                    $emails->copyToAddress = $data->copyToAddress ?? NULL;
                    $emails->htmlBody = $data->htmlBody ?? NULL;
                    $emails->textBody = $data->textBody ?? NULL;
                    $emails->attachment = $data->attachment ?? NULL;

            
            
                    
                    if(
                    !empty($emails->toAddress)&&
                    !empty($emails->htmlBody)&&
                    $emails->sendMail()
                    )
                    {
                        

                        
                        // set response code
                        http_response_code(200);
                        
                        // display message: user was created
                        echo json_encode(array(
                            "message" => "Email sent.",
                            // "body" => html_entity_decode($emails->sentHTML),
                            // "arveNimi" => $email->arveNimi,
                            // "user_id" => $email->user_id,
                            // "ticket" => $email->ticket,
                        ));
            
                        // $emailsSent->create();
                    }
                    
                    // message if unable to create user
                    else{
                    
                        // set response code
                        http_response_code(400);
                    
                        // display message: unable to create user
                        echo json_encode(array("\n message" => "Email sending error."));
                    }

                }
                break;
            case 'files':
                    if($data->op == "upload"){
                        $file->tmp_name = $_FILES["uploadedFile"]['tmp_name'];
                        $file->error = $_FILES["uploadedFile"]["error"];
                        $file->fileName = $_POST['fileName'] ? $_POST['fileName'] : $_FILES["uploadedFile"]['name'];
                        $file->fileType = pathinfo($file->fileName, PATHINFO_EXTENSION);
                        $file->filePath =  $_POST['filePath'];
                        $file->fileGroup =  isset($_POST['fileGroup']) ? $_POST['fileGroup'] : NULL;
                        $file->table = isset($_POST['table']) ? $_POST['table'] : NULL;
                        $file->id = $_POST['id'];
                        $onlyUpload = isset($_POST['onlyUpload']) ? $_POST['onlyUpload'] : FALSE;

                        if(
                            $res = $file->createAndUpload()
                            )
                            {
                                
                                // set response code
                                http_response_code(200);
                                
                                // display message: user was created
                    
                    
                                if($res['status'] == "success"){
                                        $file->filePath = $res['url'];
                                        if($stmt = $file->addFileToDatabase()){
                                            echo json_encode(array(
                                                "path" => $file->filePath,
                                                "name" => $file->fileName,
                                                "tempname" => $file->tmp_name,
                                                "fileGroup" => $file->fileGroup,
                                                "status" => $res['status'],
                                                "error" => $res['error'],
                                                "message" => $res['message'] . " and file added to database",
                                                "url" => $res['url'],
                                                "id" => $stmt
                                                // "user_id" => $file->user_id,
                                                // "ticket" => $file->ticket,
                                            ));
                                        }
                                }
                            }
                            
                            // message if unable to create user
                            else{
                            
                                // set response code
                                http_response_code(400);
                            
                                // display message: unable to create user
                                echo json_encode(array("\n message" => ""));
                            }
                   
                    }else
                    if($data->op == "delete"){
                        $file->id = $data->id;
                        $file->filePath = $data->filePath;
                        $file->removeFolder = $data->removeFolder ? true : false;
        
                        // update the client record
                        if(
                            $file->delete()
                        )
                        {
                            if($file->deleteFromDatabase()){
                                // set response code
                                http_response_code(200);
                                
                                // display message: user was created
                                echo json_encode(array(
                                    "message" => "File deleted",
                                    "path" => $file->filePath,
                                    // "user_id" => $file->user_id,
                                    // "ticket" => $file->ticket,
                                ));
                
                            }else{
                                // set response code
                                http_response_code(400);
                            
                                // display message: unable to create user
                                echo json_encode(array("\n message" => "File deleted but problem with database."));
                            }
                            
                        }
                        
                        // message if unable to create user
                        else{
                        
                            // set response code
                            http_response_code(400);
                        
                            // display message: unable to create user
                            echo json_encode(array("\n message" => "File not deleted."));
                        }
    
                    }else {
                        // echo "Get users: \n";
                        $file->idArray = $data->idArray;
                        
                        // update the user record
                        if($stmt = $file->getFiles()){
                            // regenerate jwt will be here
                            // we need to re-generate jwt because user details might be different        
                            // set response code
                            
                            $num = $stmt->rowCount();
                            if($num > 0){
                                $file_arr = array();
                                $file_arr["records"] = array();
                                while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                                    extract($row);
                                        $file_item = array(
                                            "id" => $id,
                                            "fileName" => $fileName,
                                            "fileType" => $fileType,
                                            "filePath" => $filePath,
                                            "fileGroup" => $fileGroup,
                                            "created" => $created,
                                            "modified" => $modified,
                                            
                                        );
                                        array_push($file_arr["records"], $file_item);
                                        // if($file->showDebug) $file_arr["SQL"] = ($file->pdo_debugStrParams($stmt));
                                    
                    
                                }
                            }else{
                                $file_arr = NULL;
                            }
                    
                    
                    
                    
                            http_response_code(200);
                            
                            // response in json format
                            echo json_encode($file_arr, JSON_NUMERIC_CHECK);
                        }
                        
                        // message if unable to update user
                        else{
                            // set response code
                            http_response_code(401);
                        
                            // show error message
                            echo json_encode(array("message" => "Unable to get data."));
                        }
                    }
                    # code...
                    break;
            case 'loginLog':
                $loginLog->idArray = isset($data->idArray) ? $data->idArray : NULL;
                $loginLog->filters = isset($data->filters) ? $data->filters : NULL;
                $loginLog->lastNrows = isset($data->lastNrows) ? $data->lastNrows : NULL;
            
                // update the user record
                if($loginLog->getLoginLogs()){
                    // regenerate jwt will be here
                    // we need to re-generate jwt because user details might be different        
                    // set response code
                    $stmt = $loginLog->getLoginLogs();
                    $num = $stmt->rowCount();
                    if($num > 0){
                        $loginLog_arr = array();
                        $loginLog_arr["records"] = array();
                        while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                            extract($row);
                            $loginLog_item = array(
                                "id" => $id,
                                "user_id" => $user_id,
                                "status" => $status,
                                "time" => $time,
                                "version" => $version,
                                "object" => json_decode($object),
                            );
            
                            array_push($loginLog_arr["records"], $loginLog_item);
                        }
                        array_push($loginLog_arr, $loginLog->lastNrows);
                    }
            
            
            
            
                    http_response_code(200);
                    
                    // response in json format
                    echo json_encode($loginLog_arr);
                }
                
                // message if unable to update user
                else{
                    // set response code
                    http_response_code(401);
                
                    // show error message
                    echo json_encode(array("message" => "Unable to get data."));
                }
                break;
            default:
                http_response_code(400);
                echo "Kind empty or unknown";
                # code...
                break;
        }

    }
 
// if decode fails, it means jwt is invalid
    catch (Exception $e){
    
        // set response code
        http_response_code(401);
    
        // show error message
        echo json_encode(array(
            "message" => "Access denied.",
            "error" => $e->getMessage(),
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