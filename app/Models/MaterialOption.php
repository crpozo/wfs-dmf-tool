<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialOption extends Model
{
    // Table name
    protected $table = 'wfs.material_options';

    // Primary key
    protected $primaryKey = 'code';

    // Indicates if the primary key is auto-incrementing
    public $incrementing = false;

    // Data type of the primary key
    protected $keyType = 'string';

    // Timestamps are not used in this table
    public $timestamps = false;

    // Mass assignable attributes
    protected $fillable = [
        'code',
        'description',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
        'option_5',
        'option_6',
        'option_7',
        'option_8',
        'option_9',
        'option_10',
    ];

    /**
     * Get the SKU for a given material code and option.
     *
     * @param string $material_code
     * @param int $option
     * @return string|null
     */
    public static function getSKU(string $material_code, int $option): ?string
    {
        $materialOption = self::where('code', $material_code)
            ->first();

        return $materialOption['option_' . $option];
    }
}
