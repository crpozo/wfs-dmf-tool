@extends('errors.layout')

@section('title', 'Access Denied')
@section('code', 'Error 403')
@section('heading', 'You do not have access to this page.')
@section('message')
    This area is restricted to authorized users. If you believe you should have access, please contact your Western Fence Supply administrator.
@endsection
