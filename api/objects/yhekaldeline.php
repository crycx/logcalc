<?php
// 'user' object
class KalduKatus{
 
    // database connection and table name
    private $conn;
    private $table_name = "eelSalvestatudMajaYhekaldeline";
 
    // object properties
    public $id;
    public $majaNimi;
    public $laius;
    public $pikkus;
    public $esiseinaKorgus;
    public $tagaseinaKorgus;
    public $palgiPaksus;
    public $palgiKorgus;
    public $pikemadLauad;
    public $uksed;
    public $aknad;
    public $vundament;
    public $porandalauad;
    public $parlin;
    public $katus;
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
                majaNimi = :majaNimi,
                laius = :laius,
                pikkus = :pikkus,
                esiseinaKorgus = :esiseinaKorgus,
                tagaseinaKorgus = :tagaseinaKorgus,
                palgiPaksus = :palgiPaksus,
                palgiKorgus = :palgiKorgus,
                pikemadLauad = :pikemadLauad,
                uksed = :uksed,
                aknad = :aknad,
                vundament = :vundament,
                porandalauad = :porandalauad,
                parlin = :parlin,
                katus = :katus
                ";
 
    // prepare the query
    $stmt = $this->conn->prepare($query);


 
    // sanitize
    $this->majaNimi= $this->majaNimi ?  htmlspecialchars(strip_tags($this->majaNimi)) : NULL;
    $this->laius= $this->laius ?  htmlspecialchars(strip_tags($this->laius)) : NULL;
    $this->pikkus= $this->pikkus ?  htmlspecialchars(strip_tags($this->pikkus)) : NULL;
    $this->esiseinaKorgus= $this->esiseinaKorgus ?  htmlspecialchars(strip_tags($this->esiseinaKorgus)) : NULL;
    $this->tagaseinaKorgus= $this->tagaseinaKorgus ?  htmlspecialchars(strip_tags($this->tagaseinaKorgus)) : NULL;
    $this->palgiPaksus= $this->palgiPaksus ?  htmlspecialchars(strip_tags($this->palgiPaksus)) : NULL;
    $this->palgiKorgus= $this->palgiKorgus ?  htmlspecialchars(strip_tags($this->palgiKorgus)) : NULL;
    $this->pikemadLauad= $this->pikemadLauad ? json_encode($this->pikemadLauad) : NULL;
    $this->uksed= $this->uksed ? json_encode($this->uksed) : NULL;
    $this->aknad= $this->aknad ? json_encode($this->aknad) : NULL;
    $this->vundament= $this->vundament ? json_encode($this->vundament) : NULL;
    $this->porandalauad= $this->porandalauad ? json_encode($this->porandalauad) : NULL;
    $this->parlin= $this->parlin ? json_encode($this->parlin) : NULL;
    $this->katus= $this->katus ? json_encode($this->katus) : NULL;
 
    // bind the values
    $stmt->bindParam(':majaNimi', $this->majaNimi);
    $stmt->bindParam(':laius', $this->laius);
    $stmt->bindParam(':pikkus', $this->pikkus);
    $stmt->bindParam(':esiseinaKorgus', $this->esiseinaKorgus);
    $stmt->bindParam(':tagaseinaKorgus', $this->tagaseinaKorgus);
    $stmt->bindParam(':palgiPaksus', $this->palgiPaksus);
    $stmt->bindParam(':palgiKorgus', $this->palgiKorgus);
    $stmt->bindParam(':pikemadLauad', $this->pikemadLauad);
    $stmt->bindParam(':uksed', $this->uksed);
    $stmt->bindParam(':aknad', $this->aknad);
    $stmt->bindParam(':vundament', $this->vundament);
    $stmt->bindParam(':porandalauad', $this->porandalauad);
    $stmt->bindParam(':parlin', $this->parlin);
    $stmt->bindParam(':katus', $this->katus);
   
 
    
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
                    majaNimi = :majaNimi,
                    laius = :laius,
                    pikkus = :pikkus,
                    esiseinaKorgus = :esiseinaKorgus,
                    tagaseinaKorgus = :tagaseinaKorgus,
                    palgiPaksus = :palgiPaksus,
                    palgiKorgus = :palgiKorgus,
                    pikemadLauad = :pikemadLauad,
                    uksed = :uksed,
                    aknad = :aknad,
                    vundament = :vundament,
                    porandalauad = :porandalauad,
                    parlin = :parlin,
                    katus = :katus
                WHERE id = :id";
    
        // prepare the query
        $stmt = $this->conn->prepare($query);
    
        // sanitize
        $this->majaNimi= $this->majaNimi ?  htmlspecialchars(strip_tags($this->majaNimi)) : NULL;
        $this->laius= $this->laius ?  htmlspecialchars(strip_tags($this->laius)) : NULL;
        $this->pikkus= $this->pikkus ?  htmlspecialchars(strip_tags($this->pikkus)) : NULL;
        $this->esiseinaKorgus= $this->esiseinaKorgus ?  htmlspecialchars(strip_tags($this->esiseinaKorgus)) : NULL;
        $this->tagaseinaKorgus= $this->tagaseinaKorgus ?  htmlspecialchars(strip_tags($this->tagaseinaKorgus)) : NULL;
        $this->palgiPaksus= $this->palgiPaksus ?  htmlspecialchars(strip_tags($this->palgiPaksus)) : NULL;
        $this->palgiKorgus= $this->palgiKorgus ?  htmlspecialchars(strip_tags($this->palgiKorgus)) : NULL;
        $this->pikemadLauad= $this->pikemadLauad ? json_encode($this->pikemadLauad) : NULL;
        $this->uksed= $this->uksed ? json_encode($this->uksed) : NULL;
        $this->aknad= $this->aknad ? json_encode($this->aknad) : NULL;
        $this->vundament= $this->vundament ? json_encode($this->vundament) : NULL;
        $this->porandalauad= $this->porandalauad ? json_encode($this->porandalauad) : NULL;
        $this->parlin= $this->parlin ? json_encode($this->parlin) : NULL;
        $this->katus= $this->katus ? json_encode($this->katus) : NULL;
    
        // bind the values
        $stmt->bindParam(':majaNimi', $this->majaNimi);
        $stmt->bindParam(':laius', $this->laius);
        $stmt->bindParam(':pikkus', $this->pikkus);
        $stmt->bindParam(':esiseinaKorgus', $this->esiseinaKorgus);
        $stmt->bindParam(':tagaseinaKorgus', $this->tagaseinaKorgus);
        $stmt->bindParam(':palgiPaksus', $this->palgiPaksus);
        $stmt->bindParam(':palgiKorgus', $this->palgiKorgus);
        $stmt->bindParam(':pikemadLauad', $this->pikemadLauad);
        $stmt->bindParam(':uksed', $this->uksed);
        $stmt->bindParam(':aknad', $this->aknad);
        $stmt->bindParam(':vundament', $this->vundament);
        $stmt->bindParam(':porandalauad', $this->porandalauad);
        $stmt->bindParam(':parlin', $this->parlin);
        $stmt->bindParam(':katus', $this->katus);   
 
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

    public function getKaldu(){
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

