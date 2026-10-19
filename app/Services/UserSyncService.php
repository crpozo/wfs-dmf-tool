<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSyncService
{
    /**
     * Sync users from Fishbowl API.
     *
     * @param array $fishbowlUsers List of users retrieved from Fishbowl API.
     * @return void
     */
    public function syncUsers(array $fishbowlUsers)
    {
        foreach ($fishbowlUsers as $fishbowlUser) {
            // Validate required data
            if (!isset($fishbowlUser['email'], $fishbowlUser['userName'])) {
                continue; // Skip if email or username is missing
            }

            // Find user by email or create a new one
            $user = User::firstOrNew(['email' => $fishbowlUser['email']]);

            // Update user data
            $user->username = $fishbowlUser['userName'] ?? 'Default Name';
            $user->name = $fishbowlUser['firstName'] . ' ' . $fishbowlUser['lastName'] ?? 'Default';
            $user->password = Hash::make($fishbowlUser['userName']);
            $user->active = $fishbowlUser['activeFlag'];
            // Save the user
            $user->save();
        }
    }
}
