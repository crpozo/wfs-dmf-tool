<?php

namespace App\Classes;

use ArrayIterator;
use IteratorAggregate;

class Items implements IteratorAggregate {
    private $items;

    public function __construct($items = []) {
        $this->items = $items;
    }

    public function add(Item $item) {
        $this->items[] = $item;
    }

    public function merge(Items $items){
        $this->items[] = array_merge($this->items, $items->items);
    }

    public function getIterator() {
        return new ArrayIterator($this->items);
    }
}
