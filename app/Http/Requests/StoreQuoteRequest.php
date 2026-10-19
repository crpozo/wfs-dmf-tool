<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuoteRequest extends FormRequest
{
    public const HEAR_ABOUT_US_MAX_LENGTH = 255;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {

        return [
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:254'],
            'phone' => ['nullable', 'string', 'max:30'],

            'preferred_contact_method' => ['nullable', 'in:Email,Phone,Text'],
            'zip_code' => ['nullable', 'string', 'max:12'],

            'property_type' => ['nullable', 'in:Residential,Commercial,Industrial,HOA,Multi-unit'],
            'project_type' => ['nullable', 'in:New installation,Replacement,Repair,Temporary'],
            'timeline' => ['nullable', 'in:ASAP,1–3 months,3–6 months,Just researching'],
            'primary_reason' => ['nullable', 'string', 'max:30'],
            'hear_about_us' => ['nullable', 'string', 'max:' . self::HEAR_ABOUT_US_MAX_LENGTH],
            'lead_source_id' => ['required', 'integer', 'min:1'],
            'fulfillment_method' => ['required', 'string', 'in:pickup,delivery'],
            'company_id' => ['nullable', 'integer', 'in:1,2', 'required_if:fulfillment_method,pickup'],
            'canvas_image' => ['required', 'string'],
        ];
    }
}
