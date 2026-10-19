<?php

namespace App\Http\Controllers;

use App\Models\MapOption;
use Illuminate\Http\Request;

class MapOptionController extends Controller
{
    /**
     * Display a listing of the map options.
     */
    public function index()
    {
        $mapOptions = MapOption::all();
        return response()->json($mapOptions);
    }

    /**
     * Store a newly created map option in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'material' => 'required|integer',
            'name' => 'required|string|max:20',
            'option' => 'required|integer',
        ]);

        $mapOption = MapOption::create($validated);

        return response()->json($mapOption, 201);
    }

    /**
     * Display the specified map option.
     */
    public function show($id)
    {
        $mapOption = MapOption::findOrFail($id);
        return response()->json($mapOption);
    }

    /**
     * Update the specified map option in storage.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'material' => 'sometimes|integer',
            'name' => 'sometimes|string|max:20',
            'option' => 'sometimes|integer',
        ]);

        $mapOption = MapOption::findOrFail($id);
        $mapOption->update($validated);

        return response()->json($mapOption);
    }

    /**
     * Remove the specified map option from storage.
     */
    public function destroy($id)
    {
        $mapOption = MapOption::findOrFail($id);
        $mapOption->delete();

        return response()->json(['message' => 'Map option deleted successfully.']);
    }
}
