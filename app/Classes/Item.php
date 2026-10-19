<?php

namespace App\Classes;

class Item
{
    public $qty;
    public $code;
    public $name;
    public $color;
    public $material;
    public $length;
    public $height;
    public $description;
    public $isDoor;
    public $doorType;
    public $isDouble;

    public function __construct($qty, $code, $name, $color, $material, $length, $height, $description){
        $this->qty = $qty;
        $this->code = $code;
        $this->name = $name;
        $this->color = $color;
        $this->material = $material;
        $this->length = $length;
        $this->height = $height;
        $this->description = $description;
        $this->isDoor = false;
        $this->doorType = 0;
        $this->isDouble = false;
    }

    public function setIsDoor($isDoor) {
        $this->isDoor = $isDoor;
    }

    public function setDoorType($doorType) {
        $this->doorType = $doorType;
    }

    public function setIsDouble($isDouble) {
        $this->idDouble = $isDouble;
    }
}
