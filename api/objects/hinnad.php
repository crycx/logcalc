<?php
// 'user' object
class Hinnad{
 
    // database connection and table name
    private $conn;
    private $table_name = "hinnad";
 
    // object properties
    public $id;
    public $nimi;
    public $hinnad;
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
                nimi = :nimi,
                hinnad = :hinnad
                ";
 
    // prepare the query
    $stmt = $this->conn->prepare($query);


 
    // sanitize
    $this->nimi= $this->nimi ?  htmlspecialchars(strip_tags($this->nimi)) : NULL;
    $this->hinnad= $this->hinnad ? json_encode($this->hinnad) : NULL;
 
    // bind the values
    $stmt->bindParam(':nimi', $this->nimi);
    $stmt->bindParam(':hinnad', $this->hinnad);
   
 
    
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

 
    // update a user record
    public function update(){
    

    
        // if no posted password, do not update the password
        $query = "UPDATE " . $this->table_name . "
                SET
                    nimi = :nimi,
                    hinnad = :hinnad
                WHERE id = :id";
    
        // prepare the query
        $stmt = $this->conn->prepare($query);
    
        // sanitize
        $this->nimi= $this->nimi ?  htmlspecialchars(strip_tags($this->nimi)) : NULL;
        $this->hinnad= $this->hinnad ? json_encode($this->hinnad) : NULL;
    
        // bind the values
        $stmt->bindParam(':nimi',$this->nimi);
        $stmt->bindParam(':hinnad',$this->hinnad);
 
 
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

    public function getHinnad(){
        $idArray = $this->idArray;
        $filters = $this->filters;
        $query = "SELECT *  FROM " . $this->table_name;
        if(isset($idArray) && $idArray[0] != 0){
           $query .= " WHERE ";


            $query.= " id in(" . implode(",", $idArray).") ";

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
                $query .= $andOr .$filter->tulp." LIKE '".$filter->tekst."'";
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

}

