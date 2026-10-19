<?php

namespace App\Classes;

class FishbowlItem
{
    public $qty;
    public $sku;
    public $description;
    public $price;
    public $num;
    public $taxable;
    public $kit;
    public $uom;

    public function __construct($qty, $sku){
        $this->qty = $qty;
        $this->sku = $sku;
    }

    public function setFishbowlInfo($description, $price, $num, $taxable, $kit, $uom){
        $this->description = $description;
        $this->price = $price;
        $this->num = $num;
        $this->taxable = $taxable;
        $this->kit = $kit;
        $this->uom = $uom;
    }

}
