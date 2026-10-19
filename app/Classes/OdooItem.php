<?php

namespace App\Classes;

class OdooItem
{
    public $qty;
    public $sku;
    public $id;
    public $sort_order;
    public $description;

    public function __construct($qty, $sku, $sort_order=9999, $id = null, $description = null)
    {
        $this->qty = $qty;
        $this->sku = $sku;
        $this->id = $id;
        $this->sort_order = $sort_order ?? 9999;
        $this->description = $description;
    }

    
    public function setOdooInfo($id){
        $this->id = $id;
    }

}
