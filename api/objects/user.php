<?php
// 'user' object
class User{
 
    // database connection and table name
    private $conn;
    private $table_name = "users";
 
    // object properties
    public $id;
    public $name;
    public $email;
    public $password;
    public $admin;
    public $company_id;
    public $object;
    public $token;
    public $idArray;
    public $debug;
    public $filters;

 
    // constructor
    public function __construct($db){
        $this->conn = $db;
    }
 
// create() method will be here
// create new user record
function create(){
    // insert query
    $query = "INSERT INTO " . $this->table_name . "
            SET
                email = :email,
                name = :name,
                password = :password,
                admin = :admin,
                object = :object,
                token = :token
                ";
 
    // prepare the query
    $stmt = $this->conn->prepare($query);


 
    // sanitize
    $this->name=htmlspecialchars(strip_tags($this->name));
    $this->email=htmlspecialchars(strip_tags($this->email));
    $this->password= $this->password ?  htmlspecialchars(strip_tags($this->password)) : NULL;
    $this->admin= $this->admin ?  htmlspecialchars(strip_tags($this->admin)) : NULL;
    $this->token= $this->token ?  htmlspecialchars(strip_tags($this->token)) : NULL;
    $this->object= $this->object ? json_encode($this->object) : NULL;
 
    // bind the values
    $stmt->bindParam(':name', $this->name);
    $stmt->bindParam(':email', $this->email);
    $stmt->bindParam(':password', $this->password);
    $stmt->bindParam(':admin', $this->admin);
    $stmt->bindParam(':token', $this->token);
    $stmt->bindParam(':object', $this->object);    
 
    // hash the password before saving to database
    if(isset($this->password)){
        $password_hash = password_hash($this->password, PASSWORD_BCRYPT);
        $stmt->bindParam(':password', $password_hash);

    }
    
    // echo "User create vardump:";
    // var_dump($stmt);
 
    // execute the query, also check if query was successful
    if($stmt->execute()){
        return $stmt;
    }else{
        $stmt->debugDumpParams();
        return false;
    }
}


public function get_user(){
    $query = "SELECT id, email FROM " . $this->table_name . " WHERE email LIKE '" . $this->email . "'";
    $stmt = $this->conn->prepare($query);
    $merged_results = [];
    if($stmt->execute()){
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            $user = array(
                "id" => $id,
                "email" => $email,
            );
            array_push($merged_results, $user);
        }
    }else{
        $stmt->debugDumpParams();
    }
    // $stmt->execute();

    return $merged_results;

} 
 
// check if given email exist in the database
function emailExists(){

	// query to check if email exists
	$query = "SELECT id, name, object, token, admin, password
			FROM " . $this->table_name . "
			WHERE email = ?
			LIMIT 0,1";

	// prepare the query
	$stmt = $this->conn->prepare( $query );
    
	// sanitize
	$this->email=htmlspecialchars(strip_tags($this->email));
    
	// bind given email value
    $stmt->bindParam(1, $this->email);
    // print_r($this->email);

	// execute the query
    $stmt->execute();
    

	// get number of rows
	$num = $stmt->rowCount();

	// if email exists, assign values to object properties for easy access and use for php sessions
	if($num>0){

		// get record details / values
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

		// assign values to object properties
		$this->id = $row['id'];
		$this->name = $row['name'];
		$this->password = $row['password'];
		$this->admin = $row['admin'];
		$this->token = $row['token'];
		$this->object = json_decode($row['object']);

		// return true because email exists in the database
		return true;
	}

	// return false if email does not exist in the database
	return false;
}

    // update a user record
    public function update(){
    
        // if password needs to be updated
        $password_set=!empty($this->password) ? ", password = :password" : "";

    
        // if no posted password, do not update the password
        $query = "UPDATE " . $this->table_name . "
                SET
                email = :email,
                name = :name,
                admin = :admin,
                object = :object,
                token = :token
                    {$password_set}
                WHERE id = :id";
    
        // prepare the query
        $stmt = $this->conn->prepare($query);
    
        // sanitize
        $this->name=htmlspecialchars(strip_tags($this->name));
        $this->email=htmlspecialchars(strip_tags($this->email));
        $this->admin= $this->admin ?  htmlspecialchars(strip_tags($this->admin)) : 0;
        $this->token= $this->token ?  htmlspecialchars(strip_tags($this->token)) : NULL;
        $this->object= $this->object ? json_encode($this->object) : NULL;
    
        // bind the values
        $stmt->bindParam(':name', $this->name);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':admin', $this->admin);
        $stmt->bindParam(':token', $this->token);
        $stmt->bindParam(':object', $this->object);    
 
    // hash the password before saving to database
    if(isset($this->password)){
        $password_hash = password_hash($this->password, PASSWORD_BCRYPT);
        $stmt->bindParam(':password', $password_hash);

    }


    
        // hash the password before saving to database
        if(!empty($this->password)){
            $this->password=htmlspecialchars(strip_tags($this->password));
            $password_hash = password_hash($this->password, PASSWORD_BCRYPT);
            $stmt->bindParam(':password', $password_hash);
        }
    
        // unique ID of record to be edited
        $stmt->bindParam(':id', $this->id);
    
        // execute the query
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
        return false;
    }

    public function update_password(){
        $query = "UPDATE " . $this->table_name . "
                SET
                    password = :password,
                    token = NULL
                WHERE id = :id";
    
        // prepare the query
        $stmt = $this->conn->prepare($query);

        // sanitize
        $this->password=htmlspecialchars($this->password);
        $password_hash = password_hash($this->password, PASSWORD_BCRYPT);
        $stmt->bindParam(':password', $password_hash);

       
        // unique ID of record to be edited
        $stmt->bindParam(':id', $this->id);
    
        // execute the query
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
        return false;
    }

    public function delete(){

        $query = "DELETE FROM " . $this->table_name . "
                WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);

        
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
    
        return false;
    }

    public function getUsers(){
        $idArray = $this->idArray;
        $filters = $this->filters;
        $query = "SELECT users.*  FROM " . $this->table_name . " users";
        if(isset($idArray) && $idArray[0] != 0){
           $query .= " WHERE ";


            $query.= " users.id in(" . implode(",", $idArray).") ";

        }else
        
        if(isset($filters) && $filters != []){
            if(isset($idArray) && $idArray != [] && $idArray[0] != 0){
                $query .= " AND (";                
            }else{
                $query .= " WHERE (";
            }
            foreach ($filters as $key => $filter) {
                $operator = isset($filter->operator) ? $filter->operator : "OR";
                $andOr = $key != 0 ? " ".$operator." " : "";
                $query .= $andOr . "users." .$filter->tulp." LIKE '".$filter->tekst."'";
            }     
            
            $query .= " )";
        }
        $stmt = $this->conn->prepare($query);
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
    
        return false;
    }


    public function editUserObject(){
        $query = "UPDATE " . $this->table_name . "
        SET
            object = :object
        WHERE id = :id";

        // prepare the query
        $stmt = $this->conn->prepare($query);

        $this->object= $this->object ? json_encode($this->object) : NULL;

        // bind the values from the form
        $stmt->bindParam(':object', $this->object);


        // unique ID of record to be edited
        $stmt->bindParam(':id', $this->id);

        // execute the query
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
        return false;
    }

    public function getUserObject(){
        $query = "SELECT object FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
        return false;
    }
    
    public function check_hash(){
        $query = "SELECT id, name, email FROM ". $this->table_name . " WHERE token like '" . $this->token . "'";
        $stmt = $this->conn->prepare($query);
        $merged_results = [];
        if($stmt->execute()){
            while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
                extract($row);
                $user = array(
                    "id" => $id,
                    "name" => $name,
                    "email" => $email
                );
                array_push($merged_results, $user);
            }
        }else{
            $stmt->debugDumpParams();
            return false;
        }
        // $stmt->execute();
    
        return $merged_results;
    }


    public function resetPassword() {
        $query = "UPDATE " . $this->table_name . "
        SET
            password = NULL,
            token = :token
        WHERE id = :id";

    // prepare the query
        $stmt = $this->conn->prepare($query);

        // sanitize
        $this->token=htmlspecialchars(strip_tags($this->token));
        $stmt->bindParam(':token', $this->token);


        // unique ID of record to be edited
        $stmt->bindParam(':id', $this->id);

        if($stmt->execute()){
            return $stmt;
        }
        $stmt->debugDumpParams();
        return false;
    }
}

