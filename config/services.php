<?php

return [

    'drawfence_embed' => [
        'parent_origin' => env('DRAWFENCE_EMBED_PARENT_ORIGIN', 'https://www.westernfencesupply.com'),
    ],

    // Property map (Phase 2, Feature 1). The browser key is restricted by HTTP referrer,
    // the server key (Static Maps) by the server IP. A missing browser key keeps the
    // classic canvas.
    'google_maps' => [
        'browser_key' => env('GOOGLE_MAPS_BROWSER_KEY'),
        'server_key' => env('GOOGLE_MAPS_SERVER_KEY'),
        'map_id' => env('GOOGLE_MAPS_MAP_ID', 'DEMO_MAP_ID'),
        // Maps Static API URL signing secret (optional but recommended by Google).
        'signing_secret' => env('GOOGLE_MAPS_SIGNING_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'fishbowl' => [
        'api_url' => env('FISHBOWL_API_URL'),
        'api_port' => env('FISHBOWL_API_PORT'),
        'appname' => env('FISHBOWL_API_APPNAME'),
        'appid' => env('FISHBOWL_API_APPID'),
        'username' => env('FISHBOWL_API_USERNAME'),
        'password' => env('FISHBOWL_API_PASSWORD'),
    ],

    'odoo' => [
        'base_url' => env('ODOO_BASE_URL'),
        'api_key' => env('ODOO_API_KEY'),
        'database' => env('ODOO_DATABASE'),
        'customer' => env('ODOO_CUSTOMER'),
        'user_id' => env('ODOO_USR_ID'),
        'special_price_notes_field' => env('ODOO_SPECIAL_PRICE_NOTES_FIELD'),
    ],

];
