<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Step extends Model
{
    protected $fillable = [
        'id', 'name', 'type', 'input', 'img', 'text', 'color',
        'background', 'special_order', 'parent_id', 'next_id'
    ];

    public $incrementing = false; // important since ids are strings

    public function responses()
    {
        return $this->hasMany(Response::class, 'step_id', 'id');
    }

    public function parent()
    {
        return $this->belongsTo(Step::class, 'parent_id', 'id');
    }

    public function next()
    {
        return $this->belongsTo(Step::class, 'next_id', 'id');
    }
}
