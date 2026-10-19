<!doctype html>
<html>
<body style="font-family: Arial, sans-serif;">
<p>Hi {{ $name }},</p>

<p>Your WFS account has been created.</p>

<p>
    <strong>Login URL:</strong>
    <a href="{{ $loginUrl }}">{{ $loginUrl }}</a>
</p>

<p>
    <strong>Temporary password:</strong>
    {{ $tempPassword }}
</p>

<p>Once you log in, you can change your password in the Profile option.</p>

<p>Thanks,<br>{{ config('app.name') }}</p>
</body>
</html>
