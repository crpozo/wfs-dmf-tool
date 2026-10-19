<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Response extends Model
{
    protected $fillable = [
        'id', 'step_id', 'name', 'color', 'img', 'special_order', 'next_id', 'active'
    ];

    public $incrementing = false;

    public function step()
    {
        return $this->belongsTo(Step::class, 'step_id', 'id');
    }

    public function next()
    {
        return $this->belongsTo(Step::class, 'next_id', 'id');
    }
}
