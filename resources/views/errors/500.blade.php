@extends('errors.layout')

@section('title', 'Server Error')
@section('code', 'Error 500')
@section('heading', 'Something went wrong.')
@section('message')
    We ran into an unexpected problem while processing your request. Our team can review the error details in the system logs. Please try again in a moment.
@endsection
