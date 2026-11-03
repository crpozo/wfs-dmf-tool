<?php

namespace App\Mail;

use App\Models\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class QuoteRequestReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public QuoteRequest $quoteRequest,
        public array $submittedData = []
    ) {
    }

    public function build(): self
    {
        $mail = $this
            ->subject('New Quote Request - ' . $this->quoteRequest->full_name)
            ->view('emails.quote_request_received');

        // Property map quotes: attach the satellite image with the fence (stored in S3).
        $imagePath = $this->quoteRequest->sketch_image_path;
        if ($imagePath) {
            try {
                $mail->attachData(
                    Storage::disk('quote_images')->get($imagePath),
                    'property-map-' . ($this->quoteRequest->odoo_quote ?: $this->quoteRequest->id) . '.' . pathinfo($imagePath, PATHINFO_EXTENSION),
                    ['mime' => str_ends_with($imagePath, '.png') ? 'image/png' : 'image/jpeg']
                );
            } catch (\Throwable $exception) {
                Log::warning('Property map image could not be attached to the quote email.', [
                    'quote_request_id' => $this->quoteRequest->id,
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        return $mail;
    }
}
