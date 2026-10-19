<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Google\Client as GoogleClient;
use Google\Service\Sheets as GoogleSheets;

class GoogleSheetsController extends Controller
{
    public function send(Request $request)
    {
        $request->validate([
            'id' => 'required'
        ]);

        $spreadsheetId = config('app.sheets_spreadsheet_id', env('SHEETS_SPREADSHEET_ID'));
        $tab           = env('SHEETS_TAB', 'Hoja1');
        $idColumn      = env('SHEETS_ID_COLUMN', 'A');
        $saJsonPath    = base_path(env('GOOGLE_SA_JSON', 'storage/app/google/service-account.json'));

        // Init Google client
        $client = new GoogleClient();
        $client->setApplicationName('Laravel to Sheets');
        $client->setAuthConfig($saJsonPath);
        $client->setScopes([GoogleSheets::SPREADSHEETS]);

        $sheets = new GoogleSheets($client);

        // 1) Find row by ID in column A
        $rangeToScan = "{$tab}!{$idColumn}:{$idColumn}";
        $resp = $sheets->spreadsheets_values->get($spreadsheetId, $rangeToScan);
        $values = $resp->getValues() ?? [];

        $targetRow = null;
        $needle = (string)$request->id;

        foreach ($values as $i => $row) {
            if (($row[0] ?? '') === $needle) {
                $targetRow = $i + 1; // 1-based indexing in Sheets
                break;
            }
        }

        if (!$targetRow) {
            return response()->json(['message' => 'ID not found in sheet'], 404);
        }

        // 2) Map your results to specific columns (B..E in this example)
        // Adjust the columns/range as needed
        /*
        $updateRange = "{$tab}!B{$targetRow}:E{$targetRow}";
        $body = new \Google\Service\Sheets\ValueRange([
            'values' => [[
                1,
                2,
                3,
                4,
            ]],
        ]);

        $params = ['valueInputOption' => 'USER_ENTERED'];
        $sheets->spreadsheets_values->update($spreadsheetId, $updateRange, $body, $params);
        */
        $row = $targetRow; // Found earlier

        $valuesToWrite = [
            'C' => 1,
            'G' => 2,
            'K' => 3,
        ];

        foreach ($valuesToWrite as $col => $val) {
            $updateRange = "{$tab}!{$col}{$row}:{$col}{$row}";
            $body = new \Google\Service\Sheets\ValueRange([
                'values' => [[ $val ]]
            ]);
            $params = ['valueInputOption' => 'USER_ENTERED'];
            $sheets->spreadsheets_values->update(
                $spreadsheetId,
                $updateRange,
                $body,
                $params
            );
        }

        return response()->json(['message' => 'Copied to Google Sheet']);
    }
}
