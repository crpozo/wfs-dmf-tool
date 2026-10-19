<?php

namespace App\Http\Controllers;

use App\Services\FishbowlApiService;
use Illuminate\Support\Facades\Http;

class FishbowlAPIController
{
    public function login(FishbowlApiService $fishbowl)
    {
        $fishbowl->login();

        return $fishbowl->token;
    }

    public function getSalesOrderData(FishbowlApiService $fishbowl)
    {
        $query = "SELECT * FROM sales_order WHERE status = 'Open'";
        $data = $fishbowl->dataQuery($query);

        return response()->json($data);
    }

    public function syncUsersFromFishbowl(){
        $fishbowl = new FishbowlApiService();
        $fishbowl->syncUsersFromFishbowl();
    }

    public function dataQuery($query){
        $fishbowl = new FishbowlApiService();
        $data = $fishbowl->dataQuery($query);
        return $data;
    }

    public function createEstimate($data){
        $fishbowl = new FishbowlApiService();
        $res = $fishbowl->importSalesOrder($data);
        return $res;
    }

}

