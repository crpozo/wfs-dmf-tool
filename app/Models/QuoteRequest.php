<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuoteRequest extends Model
{
    protected $table = 'quote_requests';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'preferred_contact_method',
        'zip_code',
        'property_type',
        'project_type',
        'timeline',
        'primary_reason',
        'hear_about_us',
        'material',
        'sketch',
        'odoo_id',
        'odoo_quote',
        'sent_at',
        'user_id',
        'estimate',
        'ref',
        'delivery',
        'company_id',
        'code_id',
        'customer_id',
        'sent_id',
        'map_data',
        'sketch_image_path',
    ];

    protected $casts = [
        'sketch' => 'array',
        'material' => 'array',
        'estimate' => 'array',
        'sent_at' => 'datetime',
        'delivery' => 'boolean',
        'company_id' => 'integer',
        'code_id' => 'integer',
        'customer_id' => 'integer',
        'map_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
