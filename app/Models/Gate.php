<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gate extends Model
{
    use HasFactory;

    // Table name (optional if table name matches model name)
    protected $table = 'gates';

    // Mass assignable attributes
    protected $fillable = [
        'material',
        'color',
        'width',
        'height',
        'part',
    ];

    /**
     * Get the SKU for a gate given material, color, width and height
     *
     * @param int $material
     * @param string $color
     * @param int $width
     * @param int $height
     * @return string|null
     */
    public static function getSKU(int $material, string $color, int $width, int $height): ?string
    {
        $gate = self::where('material', $material)
            ->where('color', strtoupper($color))
            ->where('width', $width)
            ->where('height', $height)
            ->first();
        
        return $gate?->part;
    }
}
