@extends('errors.layout')

@section('title', 'Bad Request')
@section('code', 'Error 400')
@section('heading', 'We could not process that request.')
@section('message')
    Something about the request was not accepted by the server. Please go back, check the information, and try again.
@endsection
