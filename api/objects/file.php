<?php

class FileManagement{

    private $conn;

    public $fileName;
    public $tmp_name;
    public $filePath;
    public $fileGroup;
    public $error;
    public $table;
    public $url;
    public $fileType;
    public $id;
    public $idArray;
    public $removeFolder;



 
    public function __construct($db){
        $this->conn = $db;
    }
 
 
// create() method will be here
// create new user record
    function createAndUpload(){

        $response = array();
        
        
        

        if($this->error > 0){
            $response = array(
                "status" => "error",
                "error" => true,
                "message" => "Error uploading the file!"
            );
        }else 
        {
            $upload_name = $this->filePath. "/". $this->id . "/" . strtolower($this->fileName);
            $upload_name = preg_replace('/\s+/', '-', $upload_name);

            if(file_exists($this->filePath. "/". $this->id)){
                // echo "file exists \n";
            }else{
                mkdir($this->filePath. "/". $this->id, 0777, true);
            }
        
            if(move_uploaded_file($this->tmp_name , $upload_name)) {
                $response = array(
                    "status" => "success",
                    "error" => false,
                    "message" => "File uploaded successfully",
                    "url" => $upload_name
                );
            }else
            {
                $response = array(
                    "status" => "error",
                    "error" => true,
                    "message" => "Error uploading the file!"
                );
            }
        }



            

        

        return $response;


    }
 


    public function delete(){


        if(unlink($this->filePath)){
            if($this->removeFolder){
                $array = explode("/", $this->filePath);
                if(rmdir($array[0]."/".$array[1])){
                  return true;
                }
            }else{
                return true;
            }
        }
        
        return false;
    }

    public function addFileToDatabase(){
        $query = "INSERT INTO " . $this->table . "
	            SET
                    fileName = :fileName,
                    fileType = :fileType,
                    filePath = :filePath,
                    fileGroup = :fileGroup
                ";

 
        // prepare the query
        $stmt = $this->conn->prepare($query);

        // sanitize
        $this->fileName=htmlspecialchars(strip_tags($this->fileName));
        $this->fileType=htmlspecialchars(strip_tags($this->fileType));
        $this->filePath=htmlspecialchars(strip_tags($this->filePath));
        $this->fileGroup= $this->fileGroup ? htmlspecialchars(strip_tags($this->fileGroup)) : NULL;

        $stmt->bindParam(':fileName', $this->fileName);
        $stmt->bindParam(':fileType', $this->fileType);
        $stmt->bindParam(':filePath', $this->filePath);
        $stmt->bindParam(':fileGroup', $this->fileGroup);

    
        // execute the query, also check if query was successful
        if($stmt->execute()){
            //$this->newId = $stmt->execute();
            return $this->conn->lastInsertId();
        }else{
            $stmt->debugDumpParams();
            return false;
        }
    }

    public function deleteFromDatabase(){

        $query = "DELETE FROM files  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);

        
        if($stmt->execute()){
            return true;
        }
        $stmt->debugDumpParams();
    
        return false;
    }

    public function getFiles(){
        $idArray = $this->idArray;
        // $lookIn = isset($this->lookIn) ? $this->lookIn : "id";
        // $filters = $this->filters;
        $query = "SELECT ". "*" ." FROM files";
        if(isset($idArray) && $idArray != [] && $idArray[0] != 0){
            $query .= " WHERE id in (". implode(",", $idArray) . ") ";
        }
        
        if(isset($filters) && $filters != []){
            if(isset($idArray) && $idArray != [] && $idArray[0] != 0){
                $query .= " AND (";                
            }else{
                $query .= " WHERE (";
            }
            $last = null;
            foreach ($filters as $key => $filter) {
                // echo $ifGrupp;
                // if($this->showDebug) var_dump($ifGrupp);
                $andOr = $key != 0 ? ($last == "grupp" &&  $filter->tulp != "grupp" ? " AND " : " or ") : "";
                if(!strpos($filter->tulp, ".")) $query .= $andOr . " `".$filter->tulp."` LIKE '".$filter->tekst."' ";
                $last = $filter->tulp;
            }     
            
            $query .= " )";
        }
        
        $stmt = $this->conn->prepare($query);
        if($stmt->execute()){
            // $stmt->debugDumpParams();
            // if($this->showDebug) echo $this->pdo_debugStrParams($stmt);
            // $stmt->debugDumpParams();

            return $stmt;
        }
        $stmt->debugDumpParams();
    
        return false;
    }



}