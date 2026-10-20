{{-- Fragment loaded into #contenido when the project needs a second or third material. --}}
@include('partials.material-step', [
    'slot' => $material,
    'headline' => $title . '.',
    'lead' => 'Pick the next material for your project. You will configure it the same way as the first one.',
])
