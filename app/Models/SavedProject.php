<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Support\Str;

/**
 * A property map project saved by link. Anonymous and kept for 90 days.
 */
class SavedProject extends Model
{
    use Prunable;

    public const LIFETIME_DAYS = 90;

    protected $table = 'saved_projects';

    protected $fillable = [
        'token',
        'project',
        'materials',
        'expires_at',
    ];

    protected $casts = [
        'project' => 'encrypted:array',
        'materials' => 'array',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (SavedProject $saved) {
            $saved->token ??= (string) Str::ulid();
            $saved->expires_at ??= now()->addDays(self::LIFETIME_DAYS);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    public function prunable(): Builder
    {
        return static::where('expires_at', '<=', now());
    }
}
