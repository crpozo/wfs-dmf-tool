<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every request an id: it goes in each log line of the request, in the
 * X-Request-Id response header and on the error page, so an error a customer reports
 * can be found in the logs.
 */
class AssignRequestId
{
    public const ATTRIBUTE = 'request_id';

    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) Str::uuid();

        $request->attributes->set(self::ATTRIBUTE, $id);
        Log::withContext([
            'request_id' => $id,
            'method' => $request->method(),
            'path' => $request->path() === '/' ? '/' : '/' . Str::limit($request->path(), 120, ''),
        ]);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $id);

        return $response;
    }
}
