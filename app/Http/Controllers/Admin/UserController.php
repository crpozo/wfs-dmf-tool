<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\UserCreatedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        return view('admin.users.index');
    }

    public function data(Request $request)
    {
        $query = User::query()->select(['id','name','email','account_type','company_role','active','username','created_at']);

        $total = (clone $query)->count();

        if ($search = $request->input('search.value')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('account_type', 'ilike', "%{$search}%")
                    ->orWhere('company_role', 'ilike', "%{$search}%");
            });
        }

        $filtered = (clone $query)->count();

        $columns = ['id','name','email','account_type','company_role','username','created_at','active'];
        $orderColIndex = (int)($request->input('order.0.column', 0));
        $orderDir = $request->input('order.0.dir', 'asc');
        $orderCol = $columns[$orderColIndex] ?? 'id';
        $query->orderBy($orderCol, $orderDir);

        $start = (int)$request->input('start', 0);
        $length = (int)$request->input('length', 10);
        $rows = $query->skip($start)->take($length)->get();

        $data = $rows->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => e($u->name),
                'email' => e($u->email),
                'account_type' => e($u->account_type),
                'company_role' => e($u->company_role ?? ''),
                'extrafield' => e($u->username ?? ''),
                'created_at' => optional($u->created_at)->format('Y-m-d H:i'),
                'active' => (int) $u->active,
                'active_html' => $u->active
                    ? '<i class="bi bi-circle-fill text-success" title="Active"></i>'
                    : '<i class="bi bi-circle-fill text-danger" title="Inactive"></i>',
                'actions' => '<button class="btn btn-sm btn-outline-primary js-edit" data-id="'.$u->id.'">Edit</button>',
            ];
        });

        return response()->json([
            'draw' => (int)$request->input('draw'),
            'recordsTotal' => $total,
            'recordsFiltered' => $filtered,
            'data' => $data,
        ]);
    }

    // For edit modal
    public function show(User $user)
    {
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'account_type' => $user->account_type,
            'company_role' => $user->company_role,
            'extrafield' => $user->username,
            'active' => $user->active
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => ['required','email','max:255','unique:users,email'],
            'account_type' => ['required','in:customer,company'],
            'company_role' => ['nullable','in:admin,staff'],
            'extrafield' => ['nullable','string','max:255'],
            'active' => ['required','boolean'],
        ]);

        if ($validated['account_type'] === 'company' && empty($validated['company_role'])) {
            $validated['company_role'] = 'staff';
        }
        if ($validated['account_type'] === 'customer') {
            $validated['company_role'] = null;
        }

        $plainPassword = $this->generatePassword(8);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'account_type' => $validated['account_type'],
            'company_role' => $validated['company_role'],
            'username' => $validated['extrafield'] ?? null,
            'active' => (int) $validated['active'],
            'password' => Hash::make($plainPassword),
        ]);

        $loginUrl = route('login'); // or url('/login')

        $mailTo = $user->email;
        //$mailTo = 'ednincer@gmail.com';
        Mail::to($mailTo)
        ->bcc('ednincer@gmail.com')
        ->queue(new UserCreatedMail(    
            name: $user->name,
            email: $user->email,
            tempPassword: $plainPassword,
            loginUrl: $loginUrl
        ));

        // Option A: return password once (admin can copy it)
        return response()->json([
            'ok' => true,
            'message' => 'User created.',
            'temp_password' => $plainPassword,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => ['required','email','max:255','unique:users,email,'.$user->id],
            'account_type' => ['required','in:customer,company'],
            'company_role' => ['nullable','in:admin,staff'],
            'extrafield' => ['nullable','string','max:255'],
            'active' => ['required','boolean'],
        ]);

        if ($validated['account_type'] === 'company' && empty($validated['company_role'])) {
            $validated['company_role'] = 'staff';
        }
        if ($validated['account_type'] === 'customer') {
            $validated['company_role'] = null;
        }

        $user->update($validated);

        return response()->json([
            'ok' => true,
            'message' => 'User updated.',
        ]);
    }

    private function generatePassword(int $length = 8): string
    {
        $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $lower = 'abcdefghijkmnopqrstuvwxyz';
        $nums  = '23456789';
        $spec  = '!@#$%^&*()-_=+[]{}?';

        $password = [
            $upper[random_int(0, strlen($upper)-1)],
            $lower[random_int(0, strlen($lower)-1)],
            $nums[random_int(0, strlen($nums)-1)],
            $spec[random_int(0, strlen($spec)-1)],
        ];

        $all = $upper.$lower.$nums.$spec;

        while (count($password) < $length) {
            $password[] = $all[random_int(0, strlen($all)-1)];
        }

        shuffle($password);
        return implode('', $password);
    }
}
