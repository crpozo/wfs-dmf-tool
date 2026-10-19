<?php

namespace App\Http\Controllers;

use App\Models\Gate;
use Illuminate\Http\Request;

class GateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $gates = Gate::all();
        return response()->json($gates);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'material' => 'required|integer',
            'color' => 'required|string|max:15',
            'width' => 'required|integer',
            'height' => 'required|integer',
            'part' => 'required|string|max:25',
        ]);

        $gate = Gate::create($validated);

        return response()->json($gate, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $gate = Gate::findOrFail($id);
        return response()->json($gate);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'material' => 'sometimes|integer',
            'color' => 'sometimes|string|max:15',
            'width' => 'sometimes|integer',
            'height' => 'sometimes|integer',
            'part' => 'sometimes|string|max:25',
        ]);

        $gate = Gate::findOrFail($id);
        $gate->update($validated);

        return response()->json($gate);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $gate = Gate::findOrFail($id);
        $gate->delete();

        return response()->json(['message' => 'Gate deleted successfully.']);
    }
}
