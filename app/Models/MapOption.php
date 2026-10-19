<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MapOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'material',
        'name',
        'option',
        'sort_order',
    ];
    
    /**
     * Get the option number for a given material and name.
     *
     * @param int $material
     * @param string $name
     * @return int|null
     */
    public static function getOptionNumber(int $material, string $name): ?int
    {
        $mapOption = self::where('material', $material)
            ->where('name', $name)
            ->first();

        return $mapOption?->option; // Return the option number or null if not found
    }

    public static function getOptionByMaterialAndName(int $material, string $name): ?self
    {
        return self::where('material', $material)
            ->where('name', $name)
            ->first();
    }
}
