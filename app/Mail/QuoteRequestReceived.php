<?php

namespace App\Mail;

use App\Models\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

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
        return $this
            ->subject('New Quote Request - ' . $this->quoteRequest->full_name)
            ->view('emails.quote_request_received');
    }
}
