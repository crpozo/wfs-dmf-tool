<?php

namespace App\Http\Controllers;

use App\Models\MaterialOption;
use Illuminate\Http\Request;

class MaterialOptionController extends Controller
{
    /**
     * Display a listing of the material options.
     */
    public function index()
    {
        $options = MaterialOption::all();
        return response()->json($options);
    }

    /**
     * Show the form for creating a new material option.
     */
    public function create()
    {
        // If you are using Blade templates, return a view here.
        return response()->json(['message' => 'Display form for creating a new material option.']);
    }

    /**
     * Store a newly created material option in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:wfs.material_options,code',
            'description' => 'nullable|string|max:200',
            'option_1' => 'nullable|string|max:15',
            'option_2' => 'nullable|string|max:15',
            'option_3' => 'nullable|string|max:15',
            'option_4' => 'nullable|string|max:15',
            'option_5' => 'nullable|string|max:15',
            'option_6' => 'nullable|string|max:15',
            'option_7' => 'nullable|string|max:15',
            'option_8' => 'nullable|string|max:15',
            'option_9' => 'nullable|string|max:15',
            'option_10' => 'nullable|string|max:15',
        ]);

        $materialOption = MaterialOption::create($validated);

        return response()->json($materialOption, 201);
    }

    /**
     * Display the specified material option.
     */
    public function show($code)
    {
        $option = MaterialOption::findOrFail($code);
        return response()->json($option);
    }

    /**
     * Show the form for editing the specified material option.
     */
    public function edit($code)
    {
        // If you are using Blade templates, return a view here.
        return response()->json(['message' => "Display form for editing material option with code {$code}."]);
    }

    /**
     * Update the specified material option in storage.
     */
    public function update(Request $request, $code)
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:200',
            'option_1' => 'nullable|string|max:15',
            'option_2' => 'nullable|string|max:15',
            'option_3' => 'nullable|string|max:15',
            'option_4' => 'nullable|string|max:15',
            'option_5' => 'nullable|string|max:15',
            'option_6' => 'nullable|string|max:15',
            'option_7' => 'nullable|string|max:15',
            'option_8' => 'nullable|string|max:15',
            'option_9' => 'nullable|string|max:15',
            'option_10' => 'nullable|string|max:15',
        ]);

        $materialOption = MaterialOption::findOrFail($code);
        $materialOption->update($validated);

        return response()->json($materialOption);
    }

    /**
     * Remove the specified material option from storage.
     */
    public function destroy($code)
    {
        $materialOption = MaterialOption::findOrFail($code);
        $materialOption->delete();

        return response()->json(['message' => "Material option with code {$code} deleted successfully."]);
    }
}
