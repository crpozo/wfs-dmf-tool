<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use  Illuminate\Support\Facades\Hash;

use App\Classes\FishbowlItem;
use App\Classes\OdooItem;
use App\Classes\Estimate;
use App\Classes\Item;
use App\Classes\Items;

use App\Models\Gate;
use App\Models\MapOption;
use App\Models\MaterialOption;

use File;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Session;
use Response;

use Phpml\Math\LinearProgramming\LinearProgramming;
use Phpml\Math\Matrix;



class HomeController extends Controller
{
    private $json_data;
    private $step_actual = 0;
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $path = resource_path() . '/steps.json';
        if(File::exists($path)) {
            $json = file_get_contents($path);
            $this->json_data = json_decode($json,true);
        }
        //$this->middleware('auth');
    }


    private function getMaterialInfo($code){
        $route = str_split($code);
        $size = count($route);
        $pos = $size - 1;
        if($route[$pos] == "0"){
            $pos--;
        }
        $data = [];
        $material = substr($code, 0, 1);
        switch($material) {
            case "1": // Aluminio
                $data = array(0=>"material", 1=>"type", 2=>"height", 3=>"color", 4=>"style");
                break;
            case "2": // Chain Link
                $data = array(0=>"material", 1=>"type", 2=>"height", 3=>"color", 4=>"bottom", 5=>"barbwire", 6=>"barbarms");
                break;
            case "3": // Metal
                $data = array(0=>"material", 1=>"style", 2=>"height", 3=>"color", 4=>"rails");
                break;
            case "4": // Vinyl
                $data = array(0=>"material", 1=>"style", 2=>"design", 3=>"color", 4=>"height", 5=>"type");
                break;
        }
        return $data[$pos];
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function step_old($material, $step){
        $from = $_SERVER['HTTP_REFERER'];
        $route = str_split($step);
        $sel = $this->json_data;
        $size = count($route);

        if($step == 0){
            session(['material' => $material ]);
            $title = "Choose Your Second Fence Material";
            if($material == 3){
                $title = "Choose Your Third Fence Material";
            }
            return view('extra', ['title' => $title, 'material' => $material]);
        }

        $this->step_actual = intval(floor(log10($step)));

        $material_data = [];
        $breadcrum = "<nav aria-label='breadcrumb' class='nav_breadcrums'><ol class='breadcrumb'>";
        //$breadcrum .= "<li class='breadcrumb-item'><a href='#'>Home</a></li>";
        //$breadcrum .= "<li class='breadcrumb-item active' aria-current='page'>Data</li></ol></nav>";

        $acum = "";
        for($i=0;$i<$size;$i++){
            $acum = $acum . $route[$i];
            if($route[$i] == "0"){
                // Ya sé la siguiente pregunta
                $title = $sel["name"];
                $cards = $sel["responses"];
                $type = "btn";
                if(array_key_exists("type",$sel)){
                    $type = $sel["type"];
                }

                //$colSize = "col-md-" . 12 / sizeof($cards);
                $colSize = "col-md-3";
                $cardTmplImg = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-img-step'><a href='%%%URL%%%'><img src='%%%IMG%%%' alt='' class='img-fluid mt-3'/></a><div class='card-title text-center fw-bold text-decoration-none pb-3'>%%%TXT%%%</div><div class='text-center special_order'>%%%SPECIAL%%%</div></div></div>";
                //$cardTmplBtn = "<div class='$colSize'><div class='card border-0 justify-content-center'><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3'></div><div class='text-center'></div></div></a><button type='button' class='btn btn-primary' %%%STYLE%%%>%%%TXT%%%</button></div></div>";
                $cardTmplBtn = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-step' %%%STYLE%%%><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3' style='%%%TXT_STYLE%%%'>%%%TXT%%%</div></div></a></div></div>";
                $colMarginCol = (12 - sizeof($cards)*3)/2 * 100/12;
                $colMarginTmpl = "margin-left:" . $colMarginCol . "%";

                $cardsTxt = "";
                $posCard = 0;
                foreach($cards as $card){

                    $name = strtoupper($card['name']);
                    $id = $card['id'];
                    $url = "/step/" . $material . "/" . $id . "0";
                    if(!array_key_exists("next", $card)){
                        $url = "/step/" . $material . "/" . $id;
                    }
                    $cardTxt = str_replace("%%%TXT%%%", $name, $cardTmplImg);
                    if(array_key_exists("img", $card)){
                        $img = $card['img'];
                        $cardTxt = $cardTmplImg;
                        if($posCard == 0){
                            $cardTxt = str_replace("%%%COL_STYLE%%%", $colMarginTmpl, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%COL_STYLE%%%", "", $cardTxt);
                        }

                        if(array_key_exists("special_order", $card)){
                            $cardTxt = str_replace("%%%SPECIAL%%%", "* Special Order", $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%SPECIAL%%%", "", $cardTxt);
                        }
                        $cardTxt = str_replace("%%%TXT%%%", $name, $cardTxt);
                        $cardTxt = str_replace("%%%URL%%%", $url, $cardTxt);
                        $cardTxt = str_replace("%%%IMG%%%", $img, $cardTxt);
                    }
                    else{
                        //btn
                        $cardTxt = $cardTmplBtn;
                        if($posCard == 0){
                            $cardTxt = str_replace("%%%COL_STYLE%%%", $colMarginTmpl, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%COL_STYLE%%%", "", $cardTxt);
                        }


                        $cardTxt = str_replace("%%%TXT%%%", $name, $cardTxt);
                        $cardTxt = str_replace("%%%URL%%%", $url, $cardTxt);

                        if(array_key_exists("color",$card)) {
                            $color = $card['color'];
                            $cardTxt = str_replace("%%%STYLE%%%", "style='background-color:$color;'", $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%STYLE%%%", "", $cardTxt);
                        }

                        if(array_key_exists("text",$card)){
                            $cardTxt = str_replace("%%%TXT_STYLE%%%", $card["text"], $cardTxt);
                        }
                        else{
                            if($color == "#fcfcfc"){
                                $cardTxt = str_replace("%%%TXT_STYLE%%%", $card["text"], "color:black;");
                            }
                            else {
                                $cardTxt = str_replace("%%%TXT_STYLE%%%", "", $cardTxt);
                            }
                        }

                    }
                    $cardsTxt = $cardsTxt . $cardTxt;
                    $posCard++;
                }
                $titleStep = "STEP " . $this->step_actual;
                //$breadcrum .= "<li class='breadcrumb-item active' aria-current='page'>Data</li></ol></nav>";
                $breadcrum .= "</ol></nav>";

                return view('step', ['step' => $titleStep, 'title' => $title, 'from' => $from, 'cardsTxt' => $cardsTxt, 'breadcrums' => $breadcrum ]);
            }
            else{
                if($i+1 == $size){
                    // Es hoja final
                    //$material_data[] = $sel["responses"][$acum]["name"];
                    $material_data[$this->getMaterialInfo($step)] = $sel["responses"][$acum]["name"];
                    $material_data['code'] = $step;

                    $materials = session('materials');
                    $materials[$material] = $material_data;

                    session(['materials' => $materials ]);
                    session(['step' => $this->step_actual]);

                    $this->step_actual++;
                    $title = "Does your project require a second type of fencing material?";
                    if($material == 2){
                        $title = "Does your project require a third type of fencing material?";
                    }
                    elseif($material == 3){
                        return Redirect::to('/drawfence');
                    }
                    $titleStep = "STEP " . $this->step_actual;

                    $colSize = "col-md-3";
                    $cardTmplBtn = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-step' %%%STYLE%%%><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3' style='%%%TXT_STYLE%%%'>%%%TXT%%%</div><div class='text-center'></div></div></a></div></div>";
                    $cardYES = str_replace("%%%COL_STYLE%%%", "margin-left:25%;", $cardTmplBtn);
                    $cardYES = str_replace("%%%TXT_STYLE%%%", "", $cardYES);
                    $cardYES = str_replace("%%%TXT%%%", "YES", $cardYES);
                    $material++;
                    $url = "/step/$material/0";
                    $cardYES = str_replace("%%%URL%%%", $url, $cardYES);

                    $cardNO = str_replace("%%%COL_STYLE%%%", "", $cardTmplBtn);
                    $cardNO = str_replace("%%%TXT_STYLE%%%", "", $cardNO);
                    $cardNO = str_replace("%%%TXT%%%", "NO", $cardNO);
                    $cardNO = str_replace("%%%URL%%%", "/drawfence", $cardNO);

                    $cardsTxt = $cardYES . $cardNO;

                    return view('step', ['step' => $titleStep, 'title' => $title, 'from' => $from, 'cardsTxt' => $cardsTxt, 'breadcrums' => $breadcrum ]);
                    //return Redirect::to('/drawfence');
                    //return view('simple_draw');
                }
                else{
                    if(($i == 0) || (array_key_exists("id", $sel) && $acum == $sel["id"])){
                        $breadcrum .= "<li class='breadcrumb-item'><a href='#'>" . $sel[$acum]["name"]. "</a></li>";
                        //$material_data[] = $sel[$acum]["name"];
                        $material_data[$this->getMaterialInfo($acum)] = $sel[$acum]["name"];
                        $sel = $sel[$acum]["next"];
                    }
                    else{
                        if(array_key_exists($acum, $sel["responses"])) {
                            //$material_data[] = $sel["responses"][$acum]["name"];
                            $material_data[$this->getMaterialInfo($acum)] = $sel["responses"][$acum]["name"];
                            $breadcrum .= "<li class='breadcrumb-item'><a href='#'>" . $sel["responses"][$acum]["name"] . "</a></li>";
                            $sel = $sel["responses"][$acum]["next"];
                        }
                    }
                }
            }

        }
    }

    public function step_height($material, $step, $height){

        $ch = session('custom_heights', [0, 0, 0]);
        $ch[$material-1] = $height;
        session(['custom_heights' => $ch]);

        return $this->step($material, $step);
    }

    public function step($material, $step){
        //$from = $_SERVER['HTTP_REFERER'];

        $route = str_split($step);
        $sel = $this->json_data;
        $size = count($route);
        $step_note = "";
        if($step == '430'){
            $step_note = "If you require pickets in a different size or with a different picket style/finish, please contact one of our Western Fence Supply sales representatives for assistance.";
        }

        if($material == 1 && $size == 2){
            $ch = [0, 0, 0];
            session(['custom_heights' => $ch]);
        }

        $prev = "";
        for($i=0;$i<$size-2;$i++){
            $prev .= $route[$i];
        }
        if($route[$size-1] != "0"){
            $prev .= $route[$size-2];
        }
        $prev .= "0";
        $from = "/step/" . $material . "/" . $prev;

        if($step == 0){
            session(['material' => $material ]);
            $title = "Choose Your Second Fence Material";
            if($material == 3){
                $title = "Choose Your Third Fence Material";
            }
            return view('extra', ['title' => $title, 'material' => $material]);
        }

        $this->step_actual = intval(floor(log10($step)));

        $material_data = [];
        $breadcrum = "<nav aria-label='breadcrumb' class='nav_breadcrums'><ol class='breadcrumb'>";
        //$breadcrum .= "<li class='breadcrumb-item'><a href='#'>Home</a></li>";
        //$breadcrum .= "<li class='breadcrumb-item active' aria-current='page'>Data</li></ol></nav>";

        //$inputBtn = "<a id='btnInputOK' href='%%%URL%%%' type='button' class='btn btn-primary' onclick='e.preventDefault();const href = this.getAttribute(\'href\');$(\'#btnInput\').click();window.location.href = href;'>OK</a>";
        $inputBtn = "<a id='btnInputOK' href='%%%URL%%%' type='button' class='btn btn-primary' onclick='document.getElementById(\"btnInput\").click();'>OK</a>";

        $acum = "";
        for($i=0;$i<$size;$i++){
            $acum = $acum . $route[$i];
            if($route[$i] == "0"){
                // Ya sé la siguiente pregunta
                $title = $sel["name"];
                $cards = $sel["responses"];
                $type = "btn";
                if(array_key_exists("type",$sel)){
                    $type = $sel["type"];
                }

                //$colSize = "col-md-" . 12 / sizeof($cards);
                $colSize = "col-md-3";
                $cardTmplImg = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-img-step'><a href='%%%URL%%%'><img src='%%%IMG%%%' alt='' class='img-opt img-fluid mt-3'/></a><div class='card-title text-center fw-bold text-decoration-none pb-3'>%%%TXT%%%</div><div class='text-center note'>%%%NOTE%%%</div><div class='text-center special_order'>%%%SPECIAL%%%</div></div></div>";
                //$cardTmplBtn = "<div class='$colSize'><div class='card border-0 justify-content-center'><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3'></div><div class='text-center'></div></div></a><button type='button' class='btn btn-primary' %%%STYLE%%%>%%%TXT%%%</button></div></div>";
                $cardTmplBtn = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-step-alt' %%%STYLE%%%><a href='%%%URL%%%' %%%ONCLICK%%%><div class='card-body p-0'><div class='text-center mt-3' style='%%%TXT_STYLE%%%'>%%%TXT%%%</div></div></a></div><div class='text-center special_order_btn'>%%%SPECIAL%%%</div></div>";
                $colMarginCol = (12 - sizeof($cards)*3)/2 * 100/12;
                if(sizeof($cards) > 4){
                    $colMarginCol = 0;
                }
                $colMarginTmpl = "margin-left:" . $colMarginCol . "%";

                $cardsTxt = "";
                $posCard = 0;
                foreach($cards as $card){
                    //$name = strtoupper($card['name']);
                    $name = $card['name'];
                    $id = $card['id'];
                    $url = "/step/" . $material . "/" . $id . "0";
                    if(!array_key_exists("next", $card)){
                        $url = "/step/" . $material . "/" . $id;
                    }
                    $cardTxt = str_replace("%%%TXT%%%", $name, $cardTmplImg);


                    if(array_key_exists("img", $card)){
                        $img = $card['img'];
                        $cardTxt = $cardTmplImg;
                        if($posCard == 0){
                            $cardTxt = str_replace("%%%COL_STYLE%%%", $colMarginTmpl, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%COL_STYLE%%%", "", $cardTxt);
                        }

                        if(array_key_exists("special_order", $card)){
                            $spMsg = "* Special Order";
                            //Tmp PVC 
                            $spMst = "* If you require pickets in a different size or with a different picket style/finish, please contact one of our Western Fence Supply sales representatives for assistance.";
                            if(substr($step,0,1) == '1'){ //Aluminio
                                $spMsg .=  " (6-8 weeks ETA)";
                            }
                            $cardTxt = str_replace("%%%SPECIAL%%%", $spMsg, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%SPECIAL%%%", "", $cardTxt);
                        }

                        $note = "";
                        if(array_key_exists("note", $card)){
                            $note = $card['note'];
                        }

                        $cardTxt = str_replace("%%%NOTE%%%", $note, $cardTxt);
                        $cardTxt = str_replace("%%%TXT%%%", $name, $cardTxt);
                        $cardTxt = str_replace("%%%URL%%%", $url, $cardTxt);
                        $cardTxt = str_replace("%%%IMG%%%", $img, $cardTxt);
                    }
                    else{
                        //btn
                        $cardTxt = $cardTmplBtn;
                        if (strcmp(strtolower($name), "white") == 0) {
                            $cardTxt = str_replace("border-0", "x", $cardTxt);
                        }
                        if($posCard == 0){
                            $cardTxt = str_replace("%%%COL_STYLE%%%", $colMarginTmpl, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%COL_STYLE%%%", "", $cardTxt);
                        }
                        /*
                        if(array_key_exists("text",$card)){
                            $cardTxt = str_replace("%%%TXT_STYLE%%%", $card["text"], $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%TXT_STYLE%%%", "", $cardTxt);
                        }
                        */
                        if(array_key_exists("special_order", $card)){
                            $spMsg = "* Special Order";
                            if(substr($step,0,1) == '1'){ //Aluminio
                                $spMsg .=  " (6-8 weeks ETA)";
                            }
                            $cardTxt = str_replace("%%%SPECIAL%%%", $spMsg, $cardTxt);
                        }
                        else{
                            $cardTxt = str_replace("%%%SPECIAL%%%", "", $cardTxt);
                        }

                        $cardTxt = str_replace("%%%TXT%%%", $name, $cardTxt);

                        if(array_key_exists("input",$card) || $name=="Custom Height") {
                            $cardTxt = str_replace("%%%ONCLICK%%%", "onclick=\"if(event){ event.preventDefault(); event.stopPropagation(); } $('#btnInput').click(); return false;\"", $cardTxt);
                            $cardTxt = str_replace("%%%URL%%%", "javascript:;", $cardTxt);

                            $inputBtn = str_replace("%%%URL%%%", $url, $inputBtn);
                        }
                        else{
                            $cardTxt = str_replace("%%%ONCLICK%%%", "", $cardTxt);
                            $cardTxt = str_replace("%%%URL%%%", $url, $cardTxt);
                        }
                        $color="";
                        if(array_key_exists("background", $card)){
                            $bkgd = $card['background'];
                            $cardTxt = str_replace("%%%STYLE%%%", "style='background:$bkgd;'", $cardTxt);
                        }
                        else {
                            if (array_key_exists("color", $card)) {
                                $color = $card['color'];
                                $cardTxt = str_replace("%%%STYLE%%%", "style='background-color:$color;'", $cardTxt);
                            } else {
                                $cardTxt = str_replace("%%%STYLE%%%", "", $cardTxt);
                            }
                        }
                        if(array_key_exists("text",$card)){
                            $cardTxt = str_replace("%%%TXT_STYLE%%%", $card["text"], $cardTxt);
                        }
                        else{
                            if($color == "#fcfcfc"){
                                $cardTxt = str_replace("%%%TXT_STYLE%%%", "color:black;", $cardTxt);
                            }
                            else {
                                $cardTxt = str_replace("%%%TXT_STYLE%%%", "", $cardTxt);
                            }
                        }

                    }
                    $cardsTxt = $cardsTxt . $cardTxt;
                    if($posCard == 3){
                        $cardsTxt = $cardsTxt . "</div><div class='row g-4' style='margin-top:10px;'>";
                    }
                    $posCard++;
                }
                $titleStep = "STEP " . $this->step_actual;
                //$breadcrum .= "<li class='breadcrumb-item active' aria-current='page'>Data</li></ol></nav>";
                $breadcrum .= "</ol></nav>";
                
                return view('step', ['step' => $titleStep, 'title' => $title, 'from' => $from, 'cardsTxt' => $cardsTxt, 'breadcrums' => $breadcrum, 'inputBtn' => $inputBtn, 'step_note' => $step_note ]);
            }
            else{
                if($i+1 == $size){
                    // Es hoja final
                    //$material_data[] = $sel["responses"][$acum]["name"];
                    $material_data[$this->getMaterialInfo($step)] = $sel["responses"][$acum]["name"];
                    //if($this->custom_heights[$material-1] > 0 && $sel["responses"][$acum]["name"] == 'Custom Height'){
                    $ch = session('custom_heights', [0, 0, 0]);
                    if($ch[$material-1] > 0){
                        $material_data['height'] = $ch[$material-1];
                    }
                    $material_data['code'] = $step;

                    $materials = session('materials');
                    $materials[$material] = $material_data;

                    session(['materials' => $materials ]);
                    session(['step' => $this->step_actual]);

                    $this->step_actual++;
                    // TMP De momento no preguntar por 2do o 3er material
                    return redirect('/drawfence');

                    $title = "Does your project require a second type of fencing material?";
                    if($material == 2){
                        $title = "Does your project require a third type of fencing material?";
                    }
                    elseif($material == 3){
                        return Redirect::to('/drawfence');
                    }
                    $titleStep = "STEP " . $this->step_actual;

                    $colSize = "col-md-3";
                    $cardTmplBtn = "<div class='$colSize' style='%%%COL_STYLE%%%'><div class='card border-0 justify-content-center card-step-alt' %%%STYLE%%%><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3' style='%%%TXT_STYLE%%%'>%%%TXT%%%</div><div class='text-center'></div></div></a></div></div>";
                    $cardYES = str_replace("%%%COL_STYLE%%%", "margin-left:25%;", $cardTmplBtn);
                    $cardYES = str_replace("%%%TXT_STYLE%%%", "", $cardYES);
                    $cardYES = str_replace("%%%TXT%%%", "Yes", $cardYES);
                    $material++;
                    $url = "/step/$material/0";
                    $cardYES = str_replace("%%%URL%%%", $url, $cardYES);

                    $cardNO = str_replace("%%%COL_STYLE%%%", "", $cardTmplBtn);
                    $cardNO = str_replace("%%%TXT_STYLE%%%", "", $cardNO);
                    $cardNO = str_replace("%%%TXT%%%", "No", $cardNO);
                    $cardNO = str_replace("%%%URL%%%", "/drawfence", $cardNO);

                    $cardsTxt = $cardYES . $cardNO;

                    $breadcrum .= "<li class='breadcrumb-item'><a href='#'>" . $sel["responses"][$acum]["name"] . "</a></li>";
                    $breadcrum .= "</ol></nav>";

                    return view('step', ['step' => $titleStep, 'title' => $title, 'from' => $from, 'cardsTxt' => $cardsTxt, 'breadcrums' => $breadcrum, 'inputBtn' => $inputBtn, 'step_note' => $step_note ]);
                    //return Redirect::to('/drawfence');
                    //return view('simple_draw');
                }
                else{
                    if(($i == 0) || (array_key_exists("id", $sel) && $acum == $sel["id"])){
                        $breadcrum .= "<li class='breadcrumb-item'><a href='#'>" . $sel[$acum]["name"]. "</a></li>";
                        //$material_data[] = $sel[$acum]["name"];
                        $material_data[$this->getMaterialInfo($acum)] = $sel[$acum]["name"];
                        $ch = session('custom_heights', [0, 0, 0]);
                        if($ch[$material-1] > 0){
                            $material_data['height'] = $ch[$material-1];
                        }
                        $sel = $sel[$acum]["next"];
                    }
                    else{
                        if(array_key_exists($acum, $sel["responses"])) {
                            //$material_data[] = $sel["responses"][$acum]["name"];
                            $material_data[$this->getMaterialInfo($acum)] = $sel["responses"][$acum]["name"];
                            $ch = session('custom_heights', [0, 0, 0]);
                            if($ch[$material-1] > 0){
                                $material_data['height'] = $ch[$material-1];
                            }
                            $breadcrum .= "<li class='breadcrumb-item'><a href='#'>" . $sel["responses"][$acum]["name"] . "</a></li>";
                            $sel = $sel["responses"][$acum]["next"];
                        }
                    }
                }
            }
        }
    }

    public function stepold($step)
    {   $from = $_SERVER['REQUEST_URI'];
        $this->step_actual++;

        $route = str_split($step);
        $sel = $this->json_data;
        $size = count($route)-1;
        if($route[$size] != "0"){
            $size++;
        }
        $acum = "";
        for($i=0;$i<$size;$i++){
            $acum = $acum . $route[$i];
            if(($i+1) % 2 == 0){
                $sel = $sel["responses"][$acum]["next"];
            }
            else {
                $sel = $sel[$acum]["next"];
            }
        }
        /*
        $title = $this->json_data["1"]["next"]["name"];
        $type = $this->json_data["1"]["next"]["type"];
        $cards = $this->json_data["1"]["next"]["responses"];
        */

        $title = $sel["name"];

        $cards = $sel["responses"];
        $type = "btn";
        if(array_key_exists("type",$sel)){
            $type = $sel["type"];
        }

        $colSize = "col-md-" . 12 / sizeof($cards);
        $cardTmplImg = "<div class='$colSize'><div class='card border-0 justify-content-center'><a href='%%%URL%%%'><img src='/images/cover-aluminum-fence.jpg' alt='' class='img-fluid mt-3'/><div class='card-body p-0'><div class='text-center mt-3'><img src='/images/card-line.png' alt='Blue Line' width='125' class='img-fluid'/></div><div class='text-center'><img src='/images/stars.png' alt='5 stars' width='100' class='my-2 img-fluid'/></div></div></a><div class='card-title text-center fw-bold text-decoration-none pb-3'>%%%TXT%%%</div></div></div>";
        //$cardTmplBtn = "<div class='$colSize'><div class='card border-0 justify-content-center'><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3'></div><div class='text-center'></div></div></a><button type='button' class='btn btn-primary' %%%STYLE%%%>%%%TXT%%%</button></div></div>";
        $cardTmplBtn = "<div class='$colSize'><div class='card border-0 justify-content-center card-step' %%%STYLE%%%><a href='%%%URL%%%'><div class='card-body p-0'><div class='text-center mt-3'>%%%TXT%%%</div><div class='text-center'></div></div></a></div></div>";

        $cardsTxt = "";
        foreach($cards as $card){
            $name = strtoupper($card['name']);
            $id = $card['id'];
            $url = "/step/" . $id + "0";
            $cardTxt = str_replace("%%%TXT%%%", $name, $cardTmplImg);
            if($type == "img"){
                $img = $card['img'];
            }
            else{
                //btn
                $cardTxt = str_replace("%%%TXT%%%", $name, $cardTmplBtn);
                $cardTxt = str_replace("%%%URL%%%", $url, $cardTxt);

                if(array_key_exists("color",$card)) {
                    $color = $card['color'];
                    $cardTxt = str_replace("%%%STYLE%%%", "style='background-color:$color;'", $cardTxt);
                }
                else{
                    $cardTxt = str_replace("%%%STYLE%%%", "", $cardTxt);
                }

            }
            $cardsTxt = $cardsTxt . $cardTxt;
        }
        $titleStep = "STEP " . $this->step_actual;
        return view('step', ['step' => $titleStep, 'title' => $title, 'from' => $from, 'cardsTxt' => $cardsTxt ]);
    }

    public function getDims($dims){
        $dimArray = json_decode($dims);
        foreach($dimArray as $dim){
            echo '<div class="input-group mb-3"><span id="spDim" class="input-group-text">' . $dim . '</span><input id="txt_' . $dim . '" type="text" name="' . $dim . '" class="form-control" placeholder="Enter length" aria-label="Enter length"><span class="input-group-text">ft</span></div>';
        }
    }

    public function optimizePanels($length, $type){
        $output = "";
        switch($type){
            case 1: // 6 panels only
                $output = shell_exec("bash " . storage_path('app/optimize_panels_6.sh') . " $length");
                break;
            case 2: // 8 panels only
                $output = shell_exec("bash " . storage_path('app/optimize_panels_8.sh') . " $length");
                break;
            case 3: // 6 & 8 panels
                $output = shell_exec("bash " . storage_path('app/optimize_panels.sh') . " $length");
                break;
            case 4: // Prefer 6-foot panels but allow 8-foot panels if needed
                $output = shell_exec("bash " . storage_path('app/optimize_panels_prefer_6.sh') . " $length");
                break;
        }
        $pattern6 ="/P6\K.+?(?=P8)/";
        $pattern8 ="/P8\K.+?(?=END)/";

        $success6 = preg_match($pattern6, $output, $qty_6);
        $success8 = preg_match($pattern8, $output, $qty_8);
        if($success6){
            $qty_6 = $qty_6[0];
        }
        else{
            $qty_6 = 0;
        }
        if($success8){
            $qty_8 = $qty_8[0];
        }
        else{
            $qty_8 = 0;
        }
        $resp = array('panel6' => $qty_6, 'panel8' => $qty_8);
        return $resp;
    }

    public function listItems($items){
        $quote = "";
        foreach ($items as $item) {
            if(!$item->isDoor) {
                $quote .= "[" . $item->qty . "] " . $item->description . "\n\n";
            }
        }
        return $quote;
    }

    function mergeDoors($doors) {
        $results = [];

        foreach ($doors as $door) {
            if (!isset($results[$door])) {
                $results[$door] = 1;
            } else {
                $results[$door]++;
            }
        }
        return $results;
    }

    public function isStdGate($len){
        return $len == 4 || $len == 5 || $len == 6;
    }

    /**
     * Calculate the revision flags required by a sketch.
     *
     * The material codes are accepted so material-specific revision rules can be
     * added without changing the caller.
     *
     * @param string|array $jsonData
     * @param array $mat_codes
     * @param int|string $customer_id Odoo customer id
     * @return int
     */
    public function calculateRevision($jsonData, $mat_codes, $customer_id)
    {
        $data = is_string($jsonData) ? json_decode($jsonData, true) : $jsonData;

        if (!is_array($data)) {
            $data = [];
        }

        $hasNonStandardGate = false;
        $hasSpecialtyGate = false;
        $hasSpecialPrices = false;
        $hasGateAtEnd = false;
        $nodeSections = [];
        $gateNodes = [];

        $specialPriceResponse = app(CustomerController::class)
            ->specialPriceNotes(request(), $customer_id);
        $specialPriceData = $specialPriceResponse->getData(true);
        $specialPriceNotes = $specialPriceData['special_price_notes'] ?? null;
        $hasSpecialPrices = $specialPriceNotes !== null
            && trim((string) $specialPriceNotes) !== '';

        foreach ($data as $edge) {
            if (!is_array($edge) || !isset($edge['type'])) {
                continue;
            }

            $type = (int) $edge['type'];

            // Existing walls are not fence sections.
            if ($type === 6) {
                continue;
            }

            foreach (['node1', 'node2'] as $nodeKey) {
                if (isset($edge[$nodeKey])) {
                    $node = $edge[$nodeKey];
                    $nodeSections[$node] = ($nodeSections[$node] ?? 0) + 1;
                }
            }

            if ($type !== 7 && $type !== 8) {
                continue;
            }

            $length = (float) ($edge['length'] ?? 0);
            $standardWidths = $type === 7 ? [4.0, 5.0, 6.0] : [8.0, 10.0, 12.0];

            if (!in_array($length, $standardWidths, true)) {
                $hasNonStandardGate = true;
            }

            if ((int) ($edge['doorType'] ?? 0) > 0) {
                $hasSpecialtyGate = true;
            }

            foreach (['node1', 'node2'] as $nodeKey) {
                if (isset($edge[$nodeKey])) {
                    $gateNodes[] = $edge[$nodeKey];
                }
            }
        }

        foreach ($gateNodes as $node) {
            if (($nodeSections[$node] ?? 0) === 1) {
                $hasGateAtEnd = true;
                break;
            }
        }

        $hasThreeSectionNode = in_array(3, $nodeSections, true);

        return ($hasNonStandardGate ? 1 : 0)
            + ($hasSpecialtyGate ? 2 : 0)
            + ($hasSpecialPrices ? 4 : 0)
            + ($hasGateAtEnd ? 8 : 0)
            + ($hasThreeSectionNode ? 16 : 0);
    }

    public function estimateAl($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete){
        $quoteItems = new Items();
        $estimate = new Estimate();

        $mat_len[1] = 0;
        $mat_len[2] = 0;
        $mat_len[3] = 0;

        $rails[1] = 2;
        $rails[2] = 2;
        $rails[3] = 2;
        if(str_contains(strtoupper($mat_names[1]), "3 RAIL")){
            $rails[1] = 3;
        }

        // posts: 0 end post, 1 linear post, 2 corner post, 3 gate post, 4 blank post
        /*
        for($i=1;$i<4;$i++) {
            $postsCount[$i][0] = 0;
            $postsCount[$i][1] = 0;
            $postsCount[$i][2] = 0;
            $postsCount[$i][3] = 0;
            $postsCount[$i][4] = 0;
        }
        */
        $postsCount[0] = 0; // END POSTS
        $postsCount[1] = 0; // LINEAR POSTS
        $postsCount[2] = 0; // CORNER POSTS
        $postsCount[3] = 0; // GATE POSTS
        $postsCount[4] = 0; // BLANK POSTS

        $specialtyDoors = [];
        $doors = [];
        $hinges = 0;
        $latches = 0;
        $rods = 0;
        $caps = 0;

        $edgeId = 0;
        foreach($data as $edge){
            if($edge['type'] != 6) { // No Existing Wall
                $pos1 = $edge['node1'];
                $pos2 = $edge['node2'];
                $x_p1 = $edge['x2'] - $edge['x1'];
                $y_p1 = $edge['y2'] - $edge['y1'];
                $x_p2 = $edge['x1'] - $edge['x2'];
                $y_p2 = $edge['y1'] - $edge['y2'];
                $edge1 = ['x' => $x_p1, 'y' => $y_p1, 'type' => $edge['type'], 'id' => $edgeId];
                $edge2 = ['x' => $x_p2, 'y' => $y_p2, 'type' => $edge['type'], 'id' => $edgeId];
                $nodes[$pos1][] = $edge1;
                $nodes[$pos2][] = $edge2;

                if ($edge['door'] == 0) {
                    $mat_len[$edge['material']] = $mat_len[$edge['material']] + intval($edge['length']);
                    $postsCount[1] = $postsCount[1] + ceil($edge['length'] / 6.0) - 1;
                    //echo ceil($edge['length'] / 6.0) -1;
                } else {
                    $gate = '';
                    if ($edge['type'] == 7) {
                        //SINGLE DOOR
                        $caps = $caps + 2; // CASO 195

                        $postsCount[3]++; // GATE POST
                        $postsCount[0]++; // END POST

                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                $hinges++; // PARES
                                $latches++;
                                //$gate = 'SWING GATE ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];

                                if($this->isStdGate($edge['length'])){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE ' . $edge['length'] . 'FT', 1));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 1, 'CUSTOM SWING GATE ' . $edge['length'] . ' FT'));
                                }
                                break;
                            case 1:
                                // ROLLING GATE
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*12+8) . '" ';

                                $item = new Item(1, "71", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                // NO HAY ROLLING GATE EN ALUMINIO 
                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*12+8 . '" ' . $mat_colors[1];

                                $item = new Item(1, "72", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 1, 'CUSTOM SLIDING GATE ' . $edge['length'] . ' FT'));
                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(1, "73", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'CANTILEVER_GATE', 1, 'CUSTOM CANTILEVER GATE ' . $edge['length'] . ' FT'));
                                break;
                        }
                    } else if ($edge['type'] == 8) {
                        //DOUBLE DOOR
                        $postsCount[3] = $postsCount[3] + 2; // (2) GATE POST
                        $caps = $caps + 4; // CASO 195

                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                //$gate = 'DOUBLE SWING GATE ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];

                                
                                
                                if($this->isStdGate($edge['length']/2)){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE ' . $edge['length']/2 . 'FT', 2));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 2, 'CUSTOM SWING GATE ' . $edge['length']/2 . ' FT'));
                                }                                

                                $hinges = $hinges + 2; //PARES
                                $latches++;
                                $rods = $rods + 2;
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*6+8) . '" ';

                                $item = new Item(2, "81", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                // NO HAY ROLLING GATE EN ALUMINIO 
                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*6+8 . '" ' . $mat_colors[1];

                                $item = new Item(2, "82", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 2, 'CUSTOM SLIDING GATE ' . $edge['length']/2 . ' FT'));
                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(2, "83", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'CANTILEVER_GATE', 2, 'CUSTOM CANTILEVER GATE ' . $edge['length'] . ' FT'));
                                break;
                        }
                        $doors[] = $gate;
                    }
                    $doors[] = $gate;
                }
            }
            $edgeId++;
        }
        $corners = [];
        $swivels = 0;

        $doorCases = []; // Caso sección solo es puerta, reducía 2 veces (una por cada nodo)
        foreach($nodes as $node){
            if(sizeof($node) == 1){
                //$node['corner'] = 0; // END POST

                // Puerta en extremo no llega a end post sino a blank post
                if($node[0]['type'] == 7 || $node[0]['type'] == 8){

                    if(!in_array($node[0]['id'], $doorCases)) {
                        $doorCases[] = $node[0]['id']; // Caso sección solo es puerta, reducía 2 veces (una por cada nodo)
                        $postsCount[4]++; // BLANK POST
                        if ($node[0]['type'] == 7) {
                            $postsCount[0]--; // END POST
                        }
                        if ($node[0]['type'] == 8) {
                            $postsCount[3]--; // GATE POST
                        }
                    }
                }
                // <<< 26/09/2025 : CASO 207, se comenta node[corner] arriba, porque volvía a agregar el end post en el for que sigue a este for cuando hay puerta
                else{
                    $node['corner'] = 0; // END POST
                }
            }
            else{
                $edge1 = $node[0];
                $edge2 = $node[1];
                $calc = ($edge1['x']*$edge2['x']+$edge1['y']*$edge2['y'])/(sqrt(($edge1['x']**2+$edge1['y']**2)*($edge2['x']**2+$edge2['y']**2)));
                $cita = acos(round($calc,5));
                $cita = abs(round($cita / pi() * 180,1));

                if($cita == 180){
                    // --
                }
                else {
                    // <<< 17/08/2025 : CASO 121
                    if($cita < 85 || $cita > 95){
                        $swivels += $rails[1];
                    }
                    // 17/08/2025 >>>

                    // En lugar de 90 exacto se deja un rango de 15 grados de momento para ver comportamiento en dibujos libres Caso 2212
                    if ($cita > 105) {
                        $node['corner'] = 1; // LINEAR POST
                    } else {
                        // Puerta en esquina no genera CORNER POST, caso 45
                        if($node[0]['type'] != 7 && $node[0]['type'] != 8 && $node[1]['type'] != 7 && $node[1]['type'] != 8){
                            if ($cita > 85) {
                                $node['corner'] = 2; // CORNER POST
                            }
                        }
                    }
                }
            }
            $corners[] = $node;
        }

        foreach($corners as $corner){
            if(array_key_exists('corner', $corner)) {
                $postsCount[$corner['corner']] = $postsCount[$corner['corner']] + 1;
            }
        }
        $sections = [];
        $screws = [];
        for($i=1;$i<4;$i++) {
            $sections[$i] = ceil($mat_len[$i] / 6.0);
            $screws[$i] = ceil($mat_len[$i] / 100.0);
        }
        for($i=0;$i<5;$i++) {
            $caps = $caps + $postsCount[$i];
        }

        $materials = ['mat_names'=>$mat_names, 'mat_heights'=>$mat_heights, 'mat_colors'=>$mat_colors, 'caps'=>$caps, 'sections'=>$sections, 'end_posts'=>$postsCount[0], 'linear_posts'=>$postsCount[1], 'corner_posts'=>$postsCount[2], 'gate_posts'=>$postsCount[3], 'blank_posts'=>$postsCount[4], 'hinges'=>$hinges, 'latches'=>$latches, 'rods'=>$rods, 'doors'=>$doors];
        //$quote = "[" . $sections[1] . "] " . $mat_names[1] . "\n\n";
        $quoteItems->add(new Item($sections[1], null, null, $mat_colors[1], null, null, $mat_heights[1], $mat_names[1]));
        $estimate->add($this->getOdooItem($mat_codes[1], 'SECTIONS', $sections[1]));

        if($postsCount[0] > 0) {
            //$quote .= "[" . $postsCount[0] . "] " . "END POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "END POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[0], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);            
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'END POSTS', $postsCount[0]));
        }
        if($postsCount[1] > 0) {
            //$quote .= "[" . $postsCount[1] . "] " . "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[1], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LINE POSTS', $postsCount[1]));
        }
        if($postsCount[2] > 0) {
            //$quote .= "[" . $postsCount[2] . "] " . "CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[2], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'CORNER POSTS', $postsCount[2]));
        }
        if($postsCount[3] > 0) {
            //$quote .= "[" . $postsCount[3] . "] " . "GATE POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "GATE POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[3], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'GATE POSTS', $postsCount[3]));
        }
        if($postsCount[4] > 0) {
            //$quote .= "[" . $postsCount[4] . "] " . "BLANK POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "BLANK POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[4], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'BLANK POSTS', $postsCount[4]));
        }
        // <<< 17/08/2025 : CASO 121
        if($swivels > 0){
            $desc = "SWIVEL WALL BRACKET";
            $quoteItems->add(new Item($swivels, null, null, null, null, null, null, $desc));
        }
        // 17/08/2025 >>>
        // <<< 16/08/2025: Caso 120
        $totalPosts = $postsCount[0] + $postsCount[1] + $postsCount[2] + $postsCount[3] + $postsCount[4];
        if($totalPosts > 0 && $hasConcrete){
            $desc = "CONCRETE BAG";
            $concrete = ceil($totalPosts / 2);
            $quoteItems->add(new Item($concrete, null, null, null, null, null, null, $desc));
            $estimate->add($this->getOdooItem($mat_codes[1], 'CONCRETE', $concrete));

            // <<< 29/06/2026 : Pallet Fee por cada 30 sacos, se deja espacio de 1 en sort_order en BD después de CONCRETE
            if($concrete >= 30){
                $fees = floor($concrete / 30);
                $estimate->add($this->getOdooPalletFee($mat_codes[1], $fees));                
            }
            // 29/06/2006 >>>
        }
        // 16/08/2025 >>>
        if($caps > 0){
            //$quote .= "[" . $caps . "] " . "POST CAPS " . $mat_colors[1] . "\n\n";
            $desc = "POST CAPS " . $mat_colors[1];
            $item = new Item($caps, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'POST CAPS', $caps));
        }
        if($hinges > 0){
            //$quote .= "[" . $hinges . "] " . "HINGE SET " . $mat_colors[1] . "\n\n";
            $desc = "HINGE SET " . $mat_colors[1];
            $item = new Item($hinges, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'HINGES', $hinges));
        }
        if($latches > 0){
            //$quote .= "[" . $latches . "] " . "LATCH " . $mat_colors[1] . "\n\n";
            $desc = "LATCH " . $mat_colors[1];
            $item = new Item($latches, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LATCHES', $latches));
        }
        if($rods > 0){
            //$quote .= "[" . $rods . "] " . "ROD " . $mat_colors[1] . "\n\n";
            $desc = "ROD " . $mat_colors[1];
            $item = new Item($rods, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'DROP RODS', $rods));
        }
        //$quote .= "[" . $screws[1] . "] " . "SCREW FOR ALUMINUM " . $mat_colors[1] . "\n\n";
        $desc = "SCREW FOR ALUMINUM " . $mat_colors[1];
        $item = new Item($screws[1], null, null, $mat_colors[1], null, null, null, $desc);
        $quoteItems->add($item);
        $estimate->add($this->getOdooItem($mat_codes[1], 'SCREWS', $screws[1]));

        $mergedDoors = $this->mergeDoors($doors);
        foreach($mergedDoors as $door => $qty){
            //$quote .= "[1] " . $door . "\n\n";
            //$quoteItems->add(new Item(1, null, null, $mat_colors[1], null, null, null, $door));
            $quoteItems->add(new Item($qty, null, null, $mat_colors[1], null, null, null, $door));
        }

        $estimate = $estimate->updateIds();
        $estimate->addSections($mat_codes[1]);
        $estimate->sortItems();
        session(['estimate' => $estimate->getItems() ]);
        session()->save(); // Force save (optional)

        return $quoteItems;
    }

    public function estimateChainLink($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete)
    {
        $quoteItems = new Items();
        $estimate = new Estimate();
        
        $mat_len[1] = 0;
        $mat_len[2] = 0;
        $mat_len[3] = 0;

        $gate_len[1] = 0;
        $gate_len[2] = 0;
        $gate_len[3] = 0;

        $rails[1] = 0;
        $rails[2] = 0;
        $rails[3] = 0;

        $twire[1] = 0;
        $twire[2] = 0;
        $twire[3] = 0;

        $hogRings[1] = 0;
        $hogRings[2] = 0;
        $hogRings[3] = 0;

        $barbWire[1] = false;
        $barbWire[2] = false;
        $barbWire[3] = false;

        $barbArms[1] = 0;
        $barbArms[2] = 0;
        $barbArms[3] = 0;

        $bottomType[1] = 0;
        $bottomType[2] = 0;
        $bottomType[3] = 0;

        $commercial[1] = false;
        $commercial[2] = false;
        $commercial[3] = false;

        for($i=1;$i<=sizeof($mat_codes);$i++) {
            //6 dígitos => no hay barb wire, 7 dígitos = hay barb wire, 6to define ángulo
            $lenCode = strlen($mat_codes[$i]);
            if ($lenCode == 7) {
                $barbWire[$i] = true;
                $barbArms[$i] = ((int)substr($mat_codes[$i] . '', -1)); // 1=45 grados, 2=90 grados

                $bottomType[$i] = ((int)substr($mat_codes[$i] . '', -3, 1)); // 1=Bottom Rail 2=Bottom Tension Wire 3=None

                $commercial[$i] = ((int) substr($mat_codes[$i] . '', -6, 1)) == 1;
            }
            else {
                $bottomType[$i] = ((int)substr($mat_codes[$i] . '', -2, 1)); // 1=Bottom Rail 2=Bottom Tension Wire 3=None
                $commercial[$i] = ((int) substr($mat_codes[$i] . '', -5, 1)) == 1;
            }
        }

        // posts: 0 end post, 1 linear post, 2 corner post, 3 gate post, 4 blank post
        /*
        for($i=1;$i<4;$i++) {
            $postsCount[$i][0] = 0;
            $postsCount[$i][1] = 0;
            $postsCount[$i][2] = 0;
            $postsCount[$i][3] = 0;
            $postsCount[$i][4] = 0;
        }
        */
        $postsCount[0] = 0; // END POSTS
        $postsCount[1] = 0; // LINEAR POSTS
        $postsCount[2] = 0; // CORNER POSTS
        $postsCount[3] = 0; // GATE POSTS
        $postsCount[4] = 0; // BLANK POSTS

        $doors = [];
        $hingesSKit = 0;
        $hingesDKit = 0;

        $latchesSG = 0;
        $latchesDG = 0;

        $rods = 0;
        $collars = 0;
        $bolts = 0;
        $females = 0;
        $addedEndPosts = 0;
        $extraPosts = 0; // Rolling Gates

        $domeCaps = 0;

        foreach($data as $edge){
            //if($edge['type'] != 6 && ($edge['node1'] != $edge['node2'])) { // No Existing Wall
            if($edge['type'] != 6) { // No Existing Wall
                $pos1 = $edge['node1'];
                $pos2 = $edge['node2'];
                $x_p1 = $edge['x2'] - $edge['x1'];
                $y_p1 = $edge['y2'] - $edge['y1'];
                $x_p2 = $edge['x1'] - $edge['x2'];
                $y_p2 = $edge['y1'] - $edge['y2'];
                $edge1 = ['x' => $x_p1, 'y' => $y_p1, 'type' => $edge['type']];
                $edge2 = ['x' => $x_p2, 'y' => $y_p2, 'type' => $edge['type']];
                $nodes[$pos1][] = $edge1;
                $nodes[$pos2][] = $edge2;
                $mat_len[$edge['material']] = $mat_len[$edge['material']] + intval($edge['length']);
                if ($edge['door'] == 0) {
                    $postsCount[$edge['material']] = $postsCount[$edge['material']] + (ceil(intval($edge['length']) / 10.0) - 1);
                    // <<< 17/08/2025 : CASO
                    if($edge['length'] > 300) {
                        $addedEndPostsSection = ceil(intval($edge['length']) / 300.0) - 1;
                        $postsCount[0] = $postsCount[0] + $addedEndPostsSection;
                        $postsCount[$edge['material']] = $postsCount[$edge['material']] - $addedEndPostsSection;
                        $addedEndPosts += $addedEndPostsSection;
                    }
                    /*
                    else{
                        $remainder = $edge['length'];
                        for($i=0;$i < ceil($edge['length'] / 300);$i++) {
                            $postsCount[0]++;
                            $lenTmp = 300;
                            if($remainder < 300){
                                $lenTmp = $remainder;
                            }
                            $postsCount[$edge['material']] = $postsCount[$edge['material']] + (ceil(intval($lenTmp) / 10.0) - 1);
                            $remainder = $remainder - 300;
                        }
                    }
                    */
                } else {
                    $collars++;
                    $postsCount[3] = $postsCount[3] + 2; // GATE POST
                    $gate = '';
                    if ($edge['type'] == 7) {
                        //SINGLE DOOR
                        $gate_len[$edge['material']] = $gate_len[$edge['material']] + intval($edge['length']);
                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                // Estos ya no se agregan, vienen en kit
                                $hingesSKit++; // PARES
                                $latchesSG++;

                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                
                                if($this->isStdGate($edge['length']) && !$commercial[1]){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE_' . $edge['length'] . 'FT', 1));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 1, 'CUSTOM SWING GATE ' . $edge['length'] . ' FT'));
                                }
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*12+8) . '" ';

                                $item = new Item(1, "71", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'ROLLING_GATE', 1, 'CUSTOM ROLLING GATE ' . $edge['length'] . ' FT'));
                                // <<< 23/09/2025 : CASO 178 : Additional Posts
                                if($edge['length'] > 8){
                                    $extraPosts = ceil($edge['length'] / 8) - 1;
                                }
                                // 23/09/2025 >>>

                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*12+8 . '" ' . $mat_colors[1];

                                $item = new Item(1, "72", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);
                                
                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 1, 'CUSTOM SLIDING GATE ' . $edge['length'] . ' FT'));

                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(1, "73", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'CANTILEVER_GATE', 1, 'CUSTOM CANTILEVER GATE ' . $edge['length'] . ' FT'));

                                break;
                        }
                    } else if ($edge['type'] == 8) {
                        //DOUBLE DOOR
                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                $gate_len[$edge['material']] = $gate_len[$edge['material']] + intval($edge['length']);
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                
                                if($this->isStdGate($edge['length']/2) && !$commercial[1]){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE_' . $edge['length']/2 . 'FT', 2));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 2, 'CUSTOM SWING GATE ' . $edge['length']/2 . ' FT'));
                                }
                                $hingesDKit++;
                                $latchesDG++;
                                // <<< 17/08/2025 : CASO 125 : Indican nuevamente que deben ser 2 drop rods.  Además agregar 2 FEMALE y 2 BOLTS 3/8
                                //$rods = $rods + 1; // 116 For chainlink, we only supply 1 drop rod for a double gate, unless specified otherwise.
                                $rods = $rods + 1; // Nuevamente incluye 1 drop rod el hinge set
                                $bolts = $bolts + 2;
                                $females = $females + 2;
                                // 17/08/2025 >>>
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*6+8) . '" ';

                                $item = new Item(2, "81", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'ROLLING_GATE', 2, 'CUSTOM ROLLING GATE ' . $edge['length']/2 . ' FT'));

                                // <<< 23/09/2025 : CASO 178 : Additional Posts
                                if($edge['length']/2 > 8){
                                    $extraPosts = 2 * (ceil($edge['length'] / 16) - 1);
                                }
                                // 23/09/2025 >>>
                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*6+8 . '" ' . $mat_colors[1];

                                $item = new Item(2, "82", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 2, 'CUSTOM SLIDING GATE ' . $edge['length']/2 . ' FT'));

                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(2, "83", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'CANTILEVER_GATE', 2, 'CUSTOM CANTILEVER GATE ' . $edge['length']/2 . ' FT'));

                                break;
                        }
                        $doors[] = $gate;
                    }
                    $doors[] = $gate;
                }
            }
        }
        $corners = [];

        // <<< 25/08/2025 : CASO 165
        if(sizeof($data) == 1){
            $collars = 0;
        }
        // 25/08/2025 >>>

        $tensionBars = $addedEndPosts; // luego se sumará 1 tension bar por EndPost, pero los agregados por secciones > 300 llevan 1 tension bar a cada lado
        foreach($nodes as $node){
            //echo print_r($node);
            if(sizeof($node) == 1){
                $node['corner'] = 0; // END POST

                if($node[0]['type'] == 7 || $node[0]['type'] == 8){
                    $postsCount[0]--; // END POST
                    $tensionBars--; // no requiere tension bar por ser puerta a END POST
                }
            }
            else{
                $edge1 = $node[0];
                $edge2 = $node[1];

                //$cita = acos(($edge1['x']*$edge2['x']+$edge1['y']*$edge2['y'])/(sqrt(($edge1['x']**2+$edge1['y']**2)*($edge2['x']**2+$edge2['y']**2))));
                //$cita = abs(round($cita / pi() * 180,1));
                $calc = ($edge1['x']*$edge2['x']+$edge1['y']*$edge2['y'])/(sqrt(($edge1['x']**2+$edge1['y']**2)*($edge2['x']**2+$edge2['y']**2)));
                $cita = acos(round($calc,5));
                $cita = abs(round($cita / pi() * 180,1));

                // <<< 06/09/2025: CASO 182
                if(($node[0]['type'] == 7 || $node[0]['type'] == 8) && ($node[1]['type'] == 7 || $node[1]['type'] == 8)){
                    $tensionBars = $tensionBars-2; // dos puertas seguidas, poste no requiere tension bars
                }
                // 06/09/2025 >>>

                if($cita == 180 || is_nan($cita)){
                    // --
                }
                else {
                    /*
                    if ($cita > 90) {
                        $node['corner'] = 1; // LINEAR POST
                    } else {
                        $node['corner'] = 2; // CORNER POST
                    }
                    */
                    // Si hay puerta al considerar el corner post, eliminar un gate post
                    //$node['corner'] = 2; // CORNER POST
                    // Puerta en esquina no genera CORNER POST, caso 45 / 57
                    if($node[0]['type'] != 7 && $node[0]['type'] != 8 && $node[1]['type'] != 7 && $node[1]['type'] != 8){
                        $node['corner'] = 2; // CORNER POST
                    }


                    /*
                    if($edge1['type'] == 7 || $edge2['type'] == 7){
                        $postsCount[3]--;
                    }
                    if($edge1['type'] == 8 || $edge2['type'] == 8) {
                        $postsCount[3]--;
                    }
                    */
                }
            }
            $corners[] = $node;
        }
        foreach($corners as $corner){
            if(array_key_exists('corner', $corner)) {
                $postsCount[$corner['corner']] = $postsCount[$corner['corner']] + 1;
            }
        }

        $sections = [];
        $sections_1ft = [];
        $screws = [];
        $rails = [];
        $ties = 0;
        for($i=1;$i<4;$i++) {
            $sections[$i] = ceil(($mat_len[$i] - $gate_len[$i])/ 50.0);
            $sections_1ft[$i] = 0;
            if($sections[$i] * 50 - ($mat_len[$i] - $gate_len[$i]) >= 25){
                $sections[$i]--;
                $sections_1ft[$i] = $mat_len[$i] - $gate_len[$i] - ($sections[$i]*50);
            }
            $rails[$i] = ceil(($mat_len[$i] - $gate_len[$i]) / 21.0);
            $twire[$i] = ceil(($mat_len[$i] - $gate_len[$i]) / 500.0); // Tension Wire son rollos de 500 FT
            // <<< 17/08/2025 : CASO 182
            //$ties = $ties + ceil($mat_len[$i] / 100.0);
            $ties = $ties + ceil(($mat_len[$i] - $gate_len[$i]) / 100.0);
            // 17/08/2025 >>>
            //$screws[$i] = ceil($mat_len[$i] / 100.0);
        }

        // 3 lineas de Barb Wire
        $barbWireQty = ceil(($mat_len[1] * 3) / 1320);

        $caps = 0;
        for($i=0;$i<5;$i++) {
            $caps = $caps + $postsCount[$i];
        }
        $tensionBars = $tensionBars + $postsCount[0] + 2 * $postsCount[2] + $postsCount[3];
        $matheight = explode(" ", $mat_heights[1]);
        $tensionBands = $tensionBars * ((int) $matheight[0] - 1);
        $railEnd = $tensionBars;
        $braceBand = $tensionBars;

        // <<< 19/08/2025 : CASO 185
        $railClamps = 0;
        if($bottomType[1] == 1){ // Bottom Rail
            $railEnd = $railEnd * 2;
            $braceBand = $braceBand * 2;
            $railClamps = $postsCount[1];
        }
        // También si hay Tension Wire se duplican bracebands
        ///if($bottomType[1] < 3){
        if($bottomType[1] == 2){
            $braceBand = $braceBand * 2;
        }
        // 19/08/2025 >>>

        // <<< 24/09/2025 : CASO 193
        $hogRigs = 0;
        if($bottomType[1] == 2) { // Tension Wire
            $hogRigs = $ties;
        }
        // 24/09/2025 >>>

        // Caso 168: Cuando hay Barb Wire se agregan 3 brace bands por END POST, 6 por CORNER POST
        if($barbWire[1]){
            // <<< 19/08/2025 : CASO 184
            //$braceBand = $braceBand + $postsCount[0] * 3 + $postsCount[2] * 6;
            $braceBand = $braceBand + $postsCount[0] * 3 + $postsCount[2] * 6 + $postsCount[3] * 3;
            // 19/08/2025 >>>
        }

        // loopCaps = LINEAR POSTS

        $loopCaps = $postsCount[1]
        // <<< 23/09/2025 : CASO 178
        + $extraPosts;
        // 23/09/2025 >>>

        // domeCaps = END POSTS + CORNER POSTS
        $domeCaps = $domeCaps + $postsCount[0] + $postsCount[2] + $postsCount[3];

        //$materials = ['mat_names'=>$mat_names, 'mat_heights'=>$mat_heights, 'mat_colors'=>$mat_colors, 'caps'=>$caps, 'sections'=>$sections, 'end_posts'=>$postsCount[0], 'linear_posts'=>$postsCount[1], 'corner_posts'=>$postsCount[2], 'gate_posts'=>$postsCount[3], 'blank_posts'=>$postsCount[4], 'hinges'=>$hinges, 'latches'=>$latches, 'rods'=>$rods, 'doors'=>$doors];
        //$quote = "[" . $sections[1] . "] " . $mat_names[1] . " 50' ROLL\n\n";
        // Ya no se usan rolls 50' sino que se indican por pies
        //$quoteItems->add(new Item($sections[1], null, null, $mat_colors[1], null, null, $mat_heights[1], $mat_names[1] . " 50' ROLL"));
        if(($sections_1ft[1] + 50 * $sections[1] ) > 0){
            //$quote .= "[" . $sections_1ft[1] . "] " . $mat_names[1] . " PER FOOT\n\n";
            $desc = $mat_names[1] . " PER FOOT";
            $cant = $sections_1ft[1] + 50 * $sections[1];
            $item = new Item($cant, null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'CHAIN_LINK_WIRE', $cant));
        }

        if($postsCount[0] > 0 || $postsCount[2] > 0
            // <<< 23/08/2025 : CASO 186
            || $postsCount[3] > 0
            // 23/08/2025 >>>
            ) {
            //$quote .= "[" . $postsCount[0]  + $postsCount[2] + $postsCount[3] . "] " . "END POSTS / CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "END POSTS / CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $cant = $postsCount[0]  + $postsCount[2] + $postsCount[3];
            $item = new Item($cant, null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'END_CORNER_POSTS', $cant));
        }
        if($postsCount[1] > 0) {
            //$quote .= "[" . $postsCount[1] . "] " . "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $cant = $postsCount[1];
            $item = new Item($cant, null, null, $mat_colors[1], null, null, $mat_heights[1], $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LINE_POSTS', $cant));
        }

        // <<< 16/08/2025: Caso 133
        $totalPosts = $postsCount[0] + $postsCount[1] + $postsCount[2] + $postsCount[3] + $postsCount[4];
        if($totalPosts > 0 && $hasConcrete){
            $desc = "CONCRETE BAG";
            $cant = $totalPosts;
            $quoteItems->add(new Item($cant, null, null, null, null, null, null, $desc));
            $estimate->add($this->getOdooItem($mat_codes[1], 'CONCRETE', $cant));

            // <<< 29/06/2026 : Pallet Fee por cada 30 sacos, se deja espacio de 1 en sort_order en BD después de CONCRETE
            if($cant >= 30){
                $fees = floor($cant / 30);
                $estimate->add($this->getOdooPalletFee($mat_codes[1], $fees));                
            }
            // 29/06/2006 >>>
        }
        // 16/08/2025 >>>

        // <<< 06/09/2025: Caso 185 : se suma a top rail, son iguales
        if($bottomType[1] == 1){
            $rails[1] = $rails[1] + $rails[1];
        }
        // 06/09/2025 >>>
        if($rails[1] > 0) {
            //$quote .= "[" . $rails[1] . "] " . "TOP RAIL " . " " . $mat_colors[1] . "\n\n";
            $desc = "TOP RAIL " . $mat_colors[1];
            $cant = $rails[1];
            $item = new Item($cant, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'TOP_RAIL', $cant));
        }

        // <<< 06/09/2025: Caso 185 : se suma a top rail, son iguales
        /*
        if($bottomType[1] == 1){
            //$quote .= "[" . $rails[1] . "] " . "BOTTOM RAIL " . " " . $mat_colors[1] . "\n\n";
            $desc = "BOTTOM RAIL " . $mat_colors[1];
            $item = new Item($rails[1], null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
        }
        */
        // 06/09/2025 >>>

        if($bottomType[1] == 2){
            //$quote .= "[" . $rails[1] . "] " . "BOTTOM TENSION WIRE " . " " . "\n\n";
            $desc = "BOTTOM TENSION WIRE (500 FT)";
            $cant = $twire[1];
            $item = new Item($cant, null, null, null, null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'TENSION_WIRE', $cant));
        }

        if($tensionBars > 0){
            //$quote .= "[" . $tensionBars . "] " . "TENSION BARS " . $mat_colors[1] . "\n\n";
            $desc = "TENSION BARS " . $mat_colors[1];
            $cant = $tensionBars;
            $item = new Item($cant, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'TENSION_BAR', $cant));
        }
        if($tensionBands > 0){
            //$quote .= "[" . $tensionBands . "] " . "TENSION BANDS " . $mat_colors[1] . "\n\n";
            $desc = "TENSION BANDS " . $mat_colors[1];
            $cant = $tensionBands;
            $item = new Item($cant, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'TENSION_BAND', $cant));
        }
        if($railEnd > 0){
            //$quote .= "[" . $railEnd . "] " . "RAIL ENDS " . $mat_colors[1] . "\n\n";
            $desc = "RAIL ENDS " . $mat_colors[1];
            $cant = $railEnd;
            $item = new Item($cant, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'RAIL_END', $cant));
        }
        if($braceBand > 0){
            //$quote .= "[" . $braceBand . "] " . "BRACE BANDS " . $mat_colors[1] . "\n\n";
            $desc = "BRACE BANDS " . $mat_colors[1];
            $cant = $braceBand;
            $item = new Item($braceBand, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'BRACE_BANDS', $cant));
        }

        if($loopCaps > 0){
            if($barbWire[1]){
                //$quote .= "[" . $loopCaps . "] " . "BARB ARM " . $mat_colors[1];
                $desc = "BARB ARM " . $mat_colors[1];
                $angle = '45';
                if($barbArms[1] == 1){
                    //$quote .= " 45 DEGREES" . "\n\n";
                    $desc .= " 45 DEGREES";
                }
                if($barbArms[1] == 2) {
                    //$quote .= " 90 DEGREES" . "\n\n";
                    $desc .= " 90 DEGREES";
                    $angle = '90';
                }
                
                $quoteItems->add(new Item($loopCaps, null, null, $mat_colors[1], null, null, null, $desc));
                $estimate->add($this->getOdooItem($mat_codes[1], 'BARB_ARM_' . $angle, $loopCaps));

                if($barbWireQty > 0){
                    //$quote .= "[" . $barbWireQty . "] " . "BARB WIRE 1320 FT ROLL" . "\n\n";
                    $desc = "BARB WIRE 1320 FT ROLL";
                    $item = new Item($barbWireQty, null, null, null, null, null, null, $desc);
                    $quoteItems->add($item);
                    $estimate->add($this->getOdooItem($mat_codes[1], 'BARB_WIRE', $barbWireQty));
                }
            }
            else {
                //$quote .= "[" . $loopCaps . "] " . "LOOP CAPS " . $mat_colors[1] . "\n\n";
                $desc = "LOOP CAPS " . $mat_colors[1];
                $item = new Item($loopCaps, null, null, $mat_colors[1], null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'LOOP_CAPS', $loopCaps));
            }
        }
        // <<< 19/08/2025 : CASO 185
        if($railClamps > 0){
            $desc = "RAIL CLAMPS " . $mat_colors[1];
            $item = new Item($railClamps, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'RAIL_CLAMPS', $railClamps));

            // <<< 30/09/2025 : CASO 197, 2 CBOLTS por RAIL CLAMP, pero tipo dependerá de grosor de line post y bottom rail
            $desc = "C-BOLTS SINGLE";
            $item = new Item($railClamps*2, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'C_BOLT', $railClamps*2));
            // 30/09/2025 >>>
        }
        // 19/08/2025 >>>
        if($domeCaps > 0){
            //$quote .= "[" . $domeCaps . "] " . "DOME CAPS " . $mat_colors[1] . "\n\n";
            $desc = "DOME CAPS " . $mat_colors[1];
            $item = new Item($domeCaps, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'DOME_CAPS', $domeCaps));
        }
        if($ties > 0){
            //$quote .= "[" . $ties * 100 . "] " . "TIES " . $mat_colors[1] . "\n\n";
            $desc = "TIES " . $mat_colors[1];
            $item = new Item($ties * 100, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'ALUM_TIES', $ties * 100));
        }
        // <<< 24/09/2025 : CASO 193
        if($hogRigs > 0){
            $desc = "HOG RIGS " . $mat_colors[1];
            $item = new Item($hogRigs, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'HOG_RIGS', $hogRigs));
        }
        // 24/09/2025 >>>

        if($hingesSKit > 0){
            //$quote .= "[" . $hingesSKit . "] " . "SINGLE HINGE KIT " . $mat_colors[1] . "\n\n";
            $desc = "SINGLE HINGE KIT " . $mat_colors[1];
            $item = new Item($hingesSKit, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'SINGLE_HINGE_KIT', $hingesSKit));
        }
        if($hingesDKit > 0){
            //$quote .= "[" . $hingesDKit . "] " . "DOUBLE HINGE KIT " . $mat_colors[1] . "\n\n";
            $desc = "DOUBLE HINGE KIT " . $mat_colors[1];
            $item = new Item($hingesDKit, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'DOUBLE_HINGE_KIT', $hingesDKit));
        }

        // <<< 15/06/2026 los hinge kit set incluyen latch, collars, female hinge
        /*
        if($latchesSG > 0){
            //$quote .= "[" . $latchesSG . "] " . "LATCH SINGLE GATE " . $mat_colors[1] . "\n\n";
            $desc = "FORK LATCH 2-1/2\" SINGLE GATE " . $mat_colors[1];
            if($commercial[1]){
                $desc = "FORK LATCH 3\" SINGLE GATE " . $mat_colors[1];
            }
            $item = new Item($latchesSG, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
        }
        if($latchesDG > 0){
            //$quote .= "[" . $latchesDG . "] " . "LATCH DOUBLE GATE " . $mat_colors[1] . "\n\n";
            $desc = "FORK LATCH 1-3/8\" DOUBLE GATE " . $mat_colors[1];
            if($commercial[1]){
                $desc = "FORK LATCH 2\" DOUBLE GATE " . $mat_colors[1];
            }
            $item = new Item($latchesDG, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
        }        
        if($collars > 0){
            //$quote .= "[" . $collars . "] " . "COLLARS " . $mat_colors[1] . "\n\n";
            $desc = "COLLARS " . $mat_colors[1];
            $item = new Item($collars, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
        }
        */ 
        // 15/06/2026 >>>

        // <<< 23/09/2025 : CASO 178
        if($extraPosts > 0){
            $desc = "ADDITIONAL POST " . $mat_colors[1];
            $item = new Item($extraPosts, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            
            $estimate->add($this->getOdooItem($mat_codes[1], 'END_CORNER_POSTS', $extraPosts, 'ADDITIONAL POSTS'));
        }
        // 23/09/2025 >>>


        if($rods > 0){
            //$quote .= "[" . $rods . "] " . "ROD " . $mat_colors[1] . "\n\n";
            $desc = "DROP ROD " . $mat_colors[1];
            $item = new Item($rods, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'DROP_ROD', $rods));
        }
        // <<< 30/09/2025 : CASO 198
        //$nuts = ceil(($braceBand + $tensionBands) / 100.0);
        $nuts = ceil(($tensionBands + $tensionBars) / 100.0);
        // 30/09/2025 >>>
        //$quote .= "[" . $nuts . "] " . "NUTS AND BOLTS " . $mat_colors[1] . "\n\n";

        // <<< 17/08/2025 : CASO 125 / 175
        if($bolts > 0){
            $desc = "BOLT NUT 3/8\"";
            $item = new Item($bolts, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'BOLT_NUT', $bolts));
        }
        
        if($females > 0){
            $desc = "FEMALE HINGES 1-3/8\"";
            if($commercial[1]){
                $desc = "FEMALE HINGES 1-5/8\"";
            }
            $item = new Item($females, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'FEMALE_HINGES', $females));
            
        }
        // 17/08/2025 >>>

        // ONLY GALVANIZED
        //$quoteItems->add(new Item($nuts, null, null, $mat_colors[1], null, null, null, "NUTS AND BOLTS " . $mat_colors[1]));
        if($nuts > 0) {
            $quoteItems->add(new Item($nuts * 100, null, null, $mat_colors[1], null, null, null, "NUTS AND BOLTS GALVANIZED"));
            $estimate->add($this->getOdooItem($mat_codes[1], 'NUTS_BOLTS_GALV', $nuts * 100));
        }
        /*
        foreach($doors as $door){
            $quote .= "[1] " . $door . "\n\n";
        }
        */

        $mergedDoors = $this->mergeDoors($doors);
        foreach($mergedDoors as $door => $qty){
            //$quote .= "[1] " . $door . "\n\n";
            //$quoteItems->add(new Item(1, null, null, $mat_colors[1], null, null, null, $door));
            $quoteItems->add(new Item($qty, null, null, $mat_colors[1], null, null, null, $door));
        }

        $estimate = $estimate->updateIds();
        $estimate->addSections($mat_codes[1]);
        $estimate->sortItems();        
        session(['estimate' => $estimate->getItems() ]);
        session()->save(); // Force save (optional)

        return $quoteItems;
    }

    /* OLD FISHBOWL
    public function getFBItem($matCode, $name, $qty){
        $mat = substr($matCode, 0, 1);
        $option = MapOption::getOptionNumber($mat, $name);
        $part = MaterialOption::getSKU($matCode, $option);
        $fbItem = new FishbowlItem($qty, $part);
        return $fbItem;
    }

    public function getFBGate($matCode, $height, $width, $color, $qty){
        $mat = (int) substr($matCode, 0, 1);
        $part = Gate::getSKU($mat, $color, (int) $width, (int) $height);
        $fbItem = new FishbowlItem($qty, $part);
        return $fbItem;
    }
    */
    public function getOdooItem($matCode, $name, $qty, $description = null){
        $mat = substr($matCode, 0, 1);
        
        //$option = MapOption::getOptionNumber($mat, $name);
        //$part = MaterialOption::getSKU($matCode, $option);
        //$fbItem = new OdooItem($qty, $part);        
        $mapOption = MapOption::getOptionByMaterialAndName($mat, $name);
        $part = MaterialOption::getSKU($matCode, $mapOption->option);
        $odooItem = new OdooItem($qty, $part, $mapOption->sort_order, null, $description);
        
        return $odooItem;
    }

    public function getOdooPalletFee($matCode, $qty){
        $mat = substr($matCode, 0, 1);        
        $mapOption = MapOption::getOptionByMaterialAndName($mat, 'CONCRETE');
        $part = 'ST000861';
        $odooItem = new OdooItem($qty, $part, $mapOption->sort_order + 1, null, null);        
        return $odooItem;
    }

    public function getOdooGate($matCode, $height, $width, $color, $qty, $description = null){
        $mat = (int) substr($matCode, 0, 1);
        $part = Gate::getSKU($mat, $color, (int) $width, (int) $height);
        $fbItem = new OdooItem($qty, $part, 9999, null, $description);
        return $fbItem;
    }

    public function estimateMetal($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete){
        $quoteItems = new Items();
        $estimate = new Estimate();

        $mat_len[1] = 0;
        $mat_len[2] = 0;
        $mat_len[3] = 0;

        $gate_len[1] = 0;
        $gate_len[2] = 0;
        $gate_len[3] = 0;

        $postsCount[1] = 0;
        $postsCount[2] = 0;
        $postsCount[3] = 0;

        $rails[1] = 0;
        $rails[2] = 0;
        $rails[3] = 0;

        $picketScrews[1] = 0;
        $picketScrews[2] = 0;
        $picketScrews[3] = 0;

        $doors = [];
        $hinges = 0;
        $latches = 0;
        $rods = 0;
        $tlf = 0; // total linear feet
        $tdl = 0; // total doors length

        foreach($data as $edge){
            if($edge['type'] != 6) { // No Existing Wall
                $pos1 = $edge['node1'];
                $pos2 = $edge['node2'];
                $x_p1 = $edge['x2'] - $edge['x1'];
                $y_p1 = $edge['y2'] - $edge['y1'];
                $x_p2 = $edge['x1'] - $edge['x2'];
                $y_p2 = $edge['y1'] - $edge['y2'];
                $edge1 = ['x' => $x_p1, 'y' => $y_p1, 'type' => $edge['type']];
                $edge2 = ['x' => $x_p2, 'y' => $y_p2, 'type' => $edge['type']];
                $nodes[$pos1][] = $edge1;
                $nodes[$pos2][] = $edge2;
                $mat_len[$edge['material']] = $mat_len[$edge['material']] + intval($edge['length']);
                if ($edge['door'] == 0) {

                } else {
                    $gate = '';
                    if ($edge['type'] == 7) {
                        //SINGLE DOOR
                        $gate_len[$edge['material']] = $gate_len[$edge['material']] + intval($edge['length']);
                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                $hinges++; // PARES
                                $latches++;
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                
                                if($this->isStdGate($edge['length'])){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE-FRAME-' . $edge['length'] . 'FT', 1));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 1, 'CUSTOM SWING GATE ' . $edge['length'] . ' FT'));
                                }
                                //0 $estimate->add($this->getFBGate($mat_codes[1], $mat_heights[1], $edge['length'], $mat_colors[1], 1));

                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*12+8) . '" ';

                                $item = new Item(1, "71", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*12+8 . '" ' . $mat_colors[1];

                                $item = new Item(1, "72", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 1, 'CUSTOM SLIDING GATE ' . $edge['length'] . ' FT'));

                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(1, "73", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                break;
                        }
                    } else if ($edge['type'] == 8) {
                        //DOUBLE DOOR
                        switch ($edge['doorType']) {
                            case 0:
                                $gate_len[$edge['material']] = $gate_len[$edge['material']] + intval($edge['length']);
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] / 2 . 'FT ' . $mat_colors[1];
                                                            
                                if($this->isStdGate($edge['length']/2)){
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'GATE-FRAME-' . $edge['length'] / 2 . 'FT', 2));
                                }
                                else{
                                    $estimate->add($this->getOdooItem($mat_codes[1], 'CUSTOM_SWING_GATE', 2, 'CUSTOM SWING GATE ' . $edge['length']/2 . ' FT'));
                                }
                                
                                $hinges = $hinges + 2; //PARES
                                $latches++;
                                $rods = $rods + 2;
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*6+8) . '" ';

                                $item = new Item(2, "81", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*6+8 . '" ' . $mat_colors[1];

                                $item = new Item(2, "82", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);
                                
                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING_GATE', 2, 'CUSTOM SLIDING GATE ' . $edge['length']/2 . ' FT'));

                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE ' . $mat_heights[1] . ' x ' . $edge['length']/2 * 1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(2, "83", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);
                                break;
                        }
                        $doors[] = $gate; // Incluir uno acá y otro al salir, para que se incluyan 2 FRAMES
                    }
                    $doors[] = $gate;
                }
            }
        }

        $sections = [];
        $railScrews = 0;

        $factor = 1.8;
        if(str_contains(strtoupper($mat_names[1]), "ORIGINAL")){
            $factor = 1.9;
        }
        //$numRails = 2;
        for($i=1;$i<4;$i++) {
            $numRails = ((int) substr($mat_codes[$edge['material']] . '', -1)) + 1;
            $sections[$i] = ceil($mat_len[$i] * $factor / 10.0) * 10;
            $picketScrews[$i] = ceil($sections[$i] * $numRails / 100.0);
            // <<< 26/09/2025 : CASO 199 : Cambia forma de cálculo, redondear hacia abajo y sumar 4 postes
            // Poste cada 6 pies pero se agrega uno adicional por cada 70 pies por contingencia
            //$postsCount[$i] = ceil(($mat_len[$i] - $gate_len[$i]) / 6.0) + floor(($mat_len[$i] - $gate_len[$i]) / 70.0);
            $postsCount[$i] = floor(($mat_len[$i] - $gate_len[$i]) / 6.0) + 4;
            // 26/09/2025 >>>
            $rails[$i] = ceil(($mat_len[$i] - $gate_len[$i]) * $numRails / 24.0);

            // <<< 17/08/2025 : CASO 126
            //$railScrews += $mat_len[$i];
            // <<< 26/09/2025 : CASO 196 : Nueva forma de cálcular, postes x rieles, fuera del for
            //$railScrews += ceil($mat_len[$i] - $gate_len[$i]);
            //echo $postsCount[$i] . "-" . $numRails . " / ";
            // 26/09/2025 >>>
            // 17/08/2025 >>>
        }
        // <<< 26/09/2025 : CASO 196
        $railScrews = $railScrews + $postsCount[1] * $numRails;
        // 26/09/2025 >>>
        $railScrews = ceil($railScrews / 100);

        $caps = 0;
        $postsHeight = (int) $mat_heights[1] + 2;

        $materials = ['mat_names'=>$mat_names, 'mat_heights'=>$mat_heights, 'mat_colors'=>$mat_colors, 'sections'=>$sections, 'posts'=>$postsCount, 'hinges'=>$hinges, 'latches'=>$latches, 'rods'=>$rods, 'doors'=>$doors];
        //$quote = print_r($materials);
        //$quote = "[" . $sections[1] . "] " . $mat_names[1] . "\n\n";
        $quoteItems->add(new Item($sections[1], null, null, $mat_colors[1], null, null, $mat_heights[1], $mat_names[1]));
        $estimate->add($this->getOdooItem($mat_codes[1], 'PICKETS', $sections[1]));

        if($postsCount[1] > 0) {
            //$quote .= "[" . $postsCount[1] . "] " . "POWDER COATED SQUARE METAL POST " . $postsHeight . " " . $mat_colors[1] . "\n\n";
            $desc = "POWDER COATED SQUARE METAL POST " . $postsHeight . " " . $mat_colors[1];
            $quoteItems->add(new Item($postsCount[1], null, null, $mat_colors[1], null, null, $mat_heights[1], $desc));
            $estimate->add($this->getOdooItem($mat_codes[1], 'POSTS', $postsCount[1]));

            //$quote .= "[" . $postsCount[1] . "] " . "POST CAPS " . $mat_colors[1] . "\n\n";
            $desc = "POST CAPS " . $mat_colors[1];
            $quoteItems->add(new Item($postsCount[1], null, null, $mat_colors[1], null, null, null, $desc));
            $estimate->add($this->getOdooItem($mat_codes[1], 'CAPS', $postsCount[1]));

            //$quote .= "[" . $postsCount[1] . "] " . "CONCRETE BAG" . "\n\n";
            if($hasConcrete) {
                $desc = "CONCRETE BAG";
                $quoteItems->add(new Item($postsCount[1], null, null, null, null, null, null, $desc));
                $estimate->add($this->getOdooItem($mat_codes[1], 'CONCRETE', $postsCount[1]));

                // <<< 29/06/2026 : Pallet Fee por cada 30 sacos, se deja espacio de 1 en sort_order en BD después de CONCRETE
                if($postsCount[1] >= 30){
                    $fees = floor($postsCount[1] / 30);
                    $estimate->add($this->getOdooPalletFee($mat_codes[1], $fees));                    
                }
                // 29/06/2006 >>>
            }
        }
        if($rails[1] > 0) {
            //$quote .= "[" . $rails[1] . "] " . "POWDER COATED METAL RECT RAIL " . $mat_colors[1] . "\n\n";
            $desc = "POWDER COATED METAL RECT RAIL " . $mat_colors[1];
            $item = new Item($rails[1], null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'RAILS', $rails[1]));
        }
        if($picketScrews[1] > 0) {
            //$quote .= "[" . $picketScrews[1] . "] " . "#10 X3/4 ZINC SCREW " . $mat_colors[1] . "BAG OF 100\n\n";
            $desc = "#10 X 3/4 ZINC SCREW " . $mat_colors[1] . "BAG OF 100";
            $item = new Item($picketScrews[1], null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'PICKET-SCREWS', $picketScrews[1]));
        }
        if($railScrews > 0){
            //$quote .= "[" . $railScrews . "] " . "#12 X 2 ZINC SCREW GALV - BAG OF 100" . "\n\n";
            $desc = "#12 X 2 ZINC SCREW GALV - BAG OF 100";
            $item = new Item($railScrews, null, null, null, null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'RAIL-SCREWS', $railScrews));
        }
        if($hinges > 0){
            //$quote .= "[" . $hinges . "] " . "HINGE SET " . $mat_colors[1] . "\n\n";
            $desc = "HINGE SET " . $mat_colors[1];
            $item = new Item($hinges, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'HINGES', $hinges));
        }
        if($latches > 0){
            //$quote .= "[" . $latches . "] " . "LATCH " . $mat_colors[1] . "\n\n";
            $desc = "LATCH " . $mat_colors[1];
            $item = new Item($latches, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LATCHES', $latches));
        }
        if($rods > 0){
            //$quote .= "[" . $rods . "] " . "ROD " . $mat_colors[1] . "\n\n";
            $desc = "ROD " . $mat_colors[1];
            $item = new Item($rods, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'RODS', $rods));
        }        

        $mergedDoors = $this->mergeDoors($doors);
        foreach($mergedDoors as $door => $qty){
            //$quote .= $door . "\n\n";
            //$quoteItems->add(new Item(1, null, null, $mat_colors[1], null, null, null, $door));
            $quoteItems->add(new Item($qty, null, null, $mat_colors[1], null, null, null, $door));            
        }                

        //11 $estimate->getFishbowlInfo();
        //Session::push('estimate', $estimate);
        $estimate = $estimate->updateIds();
        $estimate->addSections($mat_codes[1]);
        $estimate->sortItems();        
        session(['estimate' => $estimate->getItems() ]);
        session()->save(); // Force save (optional)

        //return $quote;                  
        return $quoteItems;
        //return $estimate;
    }

    function bestRemainderMultipliersMinOvershoot(array $remainders, float $needed): array
    {
        $n = count($remainders);
        if ($n === 0) {
            return ['multipliers' => [], 'sum' => 0, 'overshoot' => $needed, 'usedCount' => 0];
        }

        // Dynamic programming approach
        $dp = [0 => []]; // sum => array of indices used
        foreach ($remainders as $i => $r) {
            $new = [];
            foreach ($dp as $sum => $used) {
                $newSum = $sum + $r;
                if (!isset($dp[$newSum]) || count($used) + 1 < count($dp[$newSum])) {
                    $new[$newSum] = array_merge($used, [$i]);
                }
            }
            $dp += $new;
        }

        // Find the smallest sum >= needed
        $bestSum = PHP_INT_MAX;
        $bestIdx = [];
        foreach ($dp as $sum => $used) {
            if ($sum >= $needed) {
                if ($sum < $bestSum || ($sum == $bestSum && count($used) < count($bestIdx))) {
                    $bestSum = $sum;
                    $bestIdx = $used;
                }
            }
        }

        // If no sum >= needed, fallback: use all pieces
        if ($bestSum === PHP_INT_MAX) {
            $bestSum = array_sum($remainders);
            $bestIdx = array_keys($remainders);
        }

        // Build binary multipliers
        $multipliers = array_fill(0, $n, 0);
        foreach ($bestIdx as $i) {
            $multipliers[$i] = 1;
        }

        $usedCount = count($bestIdx);

        return [
            'multipliers' => $multipliers,
            'sum' => $bestSum,
            'overshoot' => $bestSum - $needed,
            'usedCount' => $usedCount,
        ];
    }

    public function estimatePVC($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete){
        $quoteItems = new Items();
        $estimate = new Estimate();
        $mat_len[1] = 0;
        $mat_len[2] = 0;
        $mat_len[3] = 0;

        // posts: 0 end post, 1 linear post, 2 corner post, 3 gate post, 4 blank post
        /*
        for($i=1;$i<4;$i++) {
            $postsCount[$i][0] = 0;
            $postsCount[$i][1] = 0;
            $postsCount[$i][2] = 0;
            $postsCount[$i][3] = 0;
            $postsCount[$i][4] = 0;
        }
        */
        $postsCount[0] = 0;
        $postsCount[1] = 0;
        $postsCount[2] = 0;
        $postsCount[3] = 0;
        $postsCount[4] = 0;

        $doors = [];
        $hinges = 0;
        $latches = 0;
        $rods = 0;
        $screws = 0;

        $gate_kits = 0;
        // <<< 26/09/2025 : CASO 204 : se eliminan gatekits y se incluyen partes
        $up_rights = 0;
        $up_rights_caps = 0;
        $panels6_doors = 0;
        $panels8_doors = 0;
        // 26/09/2025 >>>
        $stiffeners = 0;
        $gate_braces = 0;

        $remainder = 0;
        $remainders = [];
        $u_channels = 0;
        $panels6 = 0;
        $panels8 = 0;

        $pickets[1] = false;
        $pickets[2] = false;
        $pickets[3] = false;

        $semipriv[1] = false;
        $semipriv[2] = false;
        $semipriv[3] = false;

        for($i=1;$i<=sizeof($mat_codes);$i++) {
            $pickets[$i] = ((int) substr($mat_codes[$i] . '', 0, 2)) == 43;            
            $semipriv[$i] = ((int) substr($mat_codes[$i] . '', 0, 2)) == 42;
        }
        
        Log::info('PICKETS : ' . ($pickets[1] ? 'true' : 'false'));
        Log::info('SEMIPRIV: ' . ($semipriv[1] ? 'true' : 'false'));

        // <<< 13/07/2026 : Fallaba si venían secciones de existing walls
        //usort($data, fn($a, $b) => $b['length'] <=> $a['length']);
        $sortableEdges = [];
        $wallReferences = [];
        foreach ($data as $edge) {
            if (($edge['type'] ?? null) === 6) {
                $wallReferences[] = $edge;
            } else {
                $sortableEdges[] = $edge;
            }
        }
        usort(
            $sortableEdges,
            fn ($a, $b) => ($b['length'] ?? 0) <=> ($a['length'] ?? 0)
        );
        $data = array_merge($sortableEdges, $wallReferences);
        // 13/07/2026 >>>

        foreach($data as $index => $edge){
            if($edge['type'] != 6) { // No Existing Wall
                $pos1 = $edge['node1'];
                $pos2 = $edge['node2'];
                $x_p1 = $edge['x2'] - $edge['x1'];
                $y_p1 = $edge['y2'] - $edge['y1'];
                $x_p2 = $edge['x1'] - $edge['x2'];
                $y_p2 = $edge['y1'] - $edge['y2'];
                $edge1 = ['x' => $x_p1, 'y' => $y_p1, 'type' => $edge['type']];
                $edge2 = ['x' => $x_p2, 'y' => $y_p2, 'type' => $edge['type']];
                $nodes[$pos1][] = $edge1;
                $nodes[$pos2][] = $edge2;
                $mat_len[$edge['material']] = $mat_len[$edge['material']] + intval($edge['length']);
                if ($edge['door'] == 0) {
                    $type = $mat_codes[$edge['material']] . '';
                    $type = substr($type, -1);
                    /*
                    $remainderBefore = $remainder;
                    //echo $edge['length'] . "-" . $remainder . " : ";
                    $panels = $this->optimizePanels($edge['length'] - $remainder, intval($type));
                    //echo print_r($panels, true);
                    // <<< 17/08/2025 : Error al no considerar lo rebajado por remainder anterior
                    //$remainder = $panels['panel6'] * 6 + $panels['panel8'] * 8 - $edge['length'];
                    $remainder = $panels['panel6'] * 6 + $panels['panel8'] * 8 - ($edge['length'] - $remainder);
                    //echo $remainder . " > ";
                    //echo $edge['length'] . "_" . $panels['panel6'] . "_" . $panels['panel8'] . "_" . $remainder . "__";
                    $panels6 = $panels6 + $panels['panel6'];
                    $panels8 = $panels8 + $panels['panel8'];
                    $postsCount[1] = $postsCount[1] + $panels['panel6'] + $panels['panel8'] - 1;
                    if ($remainder < $remainderBefore) {
                        $postsCount[1]++;
                        $u_channels = $u_channels + 2;
                    }
                    */
                    $needed = $edge['length'];

                    // Step 1: calculate panels based on remaining length
                    $remainder = array_sum($remainders);

                    // <<< 24/06/2026 : Ningún diseño de semiprivacidad reutiliza sobrantes
                    if($semipriv[1]){
                        $remainder = 0;
                    }
                    // 24/06/2026 >>>

                    $panels = $this->optimizePanels(max(0, $needed - $remainder), intval($type));
                    //echo max(0, $needed-$remainder);
                    //echo print_r($panels, true);
                    $panelsLength = $panels['panel6'] * 6 + $panels['panel8'] * 8;

                    // Step 2: determine how much remainder is needed to complete edge
                    // <<< 24/06/2026 : Ningún diseño de semiprivacidad reutiliza sobrantes
                    if($semipriv[1]){
                        $remainderToUse = 0;
                    }
                    else{
                    // 24/06/2026 >>>
                        $remainderToUse = max(0, $needed - $panelsLength);
                    }

                    if($remainderToUse > 0){
                        // Step 3: select best remainders to use
                        $result = $this->bestRemainderMultipliersMinOvershoot($remainders, $remainderToUse);
                        //echo print_r($result, true);
                        $newRemainders = [];
                        foreach ($remainders as $i => $r) {
                            if (empty($result['multipliers'][$i])) {
                                $newRemainders[] = $r; // keep if not used
                            }
                        }

                        // Add back the overshoot remainder (if positive)
                        if ($result['overshoot'] > 0) {
                            $newRemainders[] = $result['overshoot'];
                        }

                        // Replace
                        $remainders = $newRemainders;

                        $u_channels += $result['usedCount'] * 2;
                        $postsCount[1] += $result['usedCount'];
                    }
                    else{
                        if($panelsLength > $needed){
                            $remainders[] = $panelsLength - $needed;
                        }
                    }
                    $panels6 = $panels6 + $panels['panel6'];
                    $panels8 = $panels8 + $panels['panel8'];
                    $postsCount[1] = $postsCount[1] + $panels['panel6'] + $panels['panel8'] - 1;

                    //echo "Edge {$edge['length']}ft → used [" . $panels['panel6'] . "x6ft + " . $panels['panel8'] . "x8ft -> " . print_r($remainders,true);

                } else {
                    $postsCount[0]++; // END POST
                    $postsCount[0]++; // END POST
                    $screws = 1;
                    $stiffeners++;
                    $gate_braces++;
                    //$gate_kits++; // Se agrega en cada tipo por Caso 138

                    $gate = '';
                    if ($edge['type'] == 7) {
                        //SINGLE DOOR
                        $gate_kits++; // Caso 138
                        // <<< 26/09/2025 : CASO 204 : se eliminan gatekits y se incluyen partes
                        $up_rights = $up_rights + 2;
                        // <<< 10/07/2026 : Si se agrega Welded Gate quiere decir que no se deben agregar paneles                        
                        if(!$semipriv[1]){
                        // 10/07/2026 >>
                            if($edge['length'] % 8 == 0){
                                $panels8_doors = $panels8_doors + ($edge['length'] / 8);
                            }
                            else{
                                $panels6_doors = $panels6_doors + ceil($edge['length'] / 6);
                            }
                        }
                        // 26/09/2025 >>>

                        switch ($edge['doorType']) {
                            case 0:
                                // SWING GATE
                                $hinges++; // PARES
                                $latches++;
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $estimate->add($this->getOdooItem($mat_codes[1], 'WELDED_GATE', 1, 'WELDED GATE ' . $edge['length'] . ' FT'));
                                
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*12+8) . '" ';

                                $item = new Item(1, "71", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length'] . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*12+8 . '" ' . $mat_colors[1];

                                $item = new Item(1, "72", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);
                            
                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING GATE', 1, 'SLIDING GATE ' . $edge['length'] . ' FT'));

                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']*1.5  . 'FT ' . $mat_colors[1];

                                $item = new Item(1, "73", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length'], $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $quoteItems->add($item);

                                break;
                        }
                    } else if ($edge['type'] == 8) {
                        //DOUBLE DOOR
                        $gate_kits = $gate_kits + 2; // Caso 138
                        // <<< 26/09/2025 : CASO 204 : se eliminan gatekits y se incluyen partes
                        $up_rights = $up_rights + 4;

                        // <<< 10/07/2026 : Si se agrega Welded Gate quiere decir que no se deben agregar paneles                        
                        if(!$semipriv[1]){
                        // 10/07/2026 >>
                            if($edge['length'] % 8 == 0){
                                $panels8_doors = $panels8_doors + ($edge['length'] / 8);
                                $u_channels = $u_channels +  ($edge['length'] / 8) * 2; // CASO 208, si puerta doble divide panel requiere 2 u channels
                            }
                            else{
                                $panels6_doors = $panels6_doors + ceil($edge['length'] / 12) * 2;
                            }
                        }
                        // 26/09/2025 >>>

                        // Caso 103:
                        $stiffeners++;
                        $gate_braces++;

                        switch ($edge['doorType']) {
                            case 0:
                                $gate = 'GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $hinges = $hinges + 2; //PARES
                                $latches++;
                                $rods = $rods + 2;
                                
                                $estimate->add($this->getOdooItem($mat_codes[1], 'WELDED_GATE', 2, 'WELDED GATE ' . $edge['length']/2 . ' FT'));                                
                                break;
                            case 1:
                                // ROLLING GATE
                                //$gate = 'ROLLING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = '1-5/8" GATE FRAME ' . $mat_heights[1] . '\' x ' . ($edge['length']*6+8) . '" ';

                                $item = new Item(2, "81", "ROLLING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "ROLLING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                break;
                            case 2:
                                // SLIDING GATE
                                //$gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2 . 'FT ' . $mat_colors[1];
                                $gate = 'SLIDING GATE FRAME ' . $mat_heights[1] . '\' x ' . $edge['length']*6+8 . '" ' . $mat_colors[1];

                                $item = new Item(2, "82", "SLIDING GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "SLIDING GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);

                                $estimate->add($this->getOdooItem($mat_codes[1], 'SLIDING GATE', 2, 'SLIDING GATE ' . $edge['length']/2 . ' FT'));
                                break;
                            case 3:
                                // CANTILEVER GATE
                                $gate = 'CANTILEVER GATE FRAME ' . $mat_heights[1] . ' x ' . $edge['length']/2*1.5 . 'FT ' . $mat_colors[1];

                                $item = new Item(2, "83", "CANTILEVER GATE FRAME", $mat_colors[1], null, $edge['length']/2, $mat_heights[1], "CANTILEVER GATE FRAME");
                                $item->setIsDoor(true);
                                $item->setDoorType($edge['doorType']);
                                $item->setIsDouble(true);
                                $quoteItems->add($item);
                                break;
                        }
                    }
                    //$doors[] = $gate;
                }
            }
        }
        $up_rights_caps = $up_rights;
        $corners = [];
        foreach($nodes as $node){
            if(sizeof($node) == 1){
                // END POST
                // Puerta en extremo no llega a end post sino a blank post
                if($node[0]['type'] == 7 || $node[0]['type'] == 8){
                    $postsCount[4]++; // BLANK POST
                    $postsCount[0]--; // END POST
                }
                else{
                    $node['corner'] = 0; // END POST
                }
            }
            else{
                $edge1 = $node[0];
                $edge2 = $node[1];
                $cita = acos(($edge1['x']*$edge2['x']+$edge1['y']*$edge2['y'])/(sqrt(($edge1['x']**2+$edge1['y']**2)*($edge2['x']**2+$edge2['y']**2))));
                $cita = abs(round($cita / pi() * 180,1));
                if($cita == 180){
                    // --
                }
                else {
                    // se pone un rango de 90 a 105 para corner posts para probar
                    if ($cita > 105) {
                        $node['corner'] = 1; // LINEAR POST
                    } else {
                        //$node['corner'] = 2; // CORNER POST
                        // Puerta en esquina no genera CORNER POST, caso 45 / 57
                        if($node[0]['type'] != 7 && $node[0]['type'] != 8 && $node[1]['type'] != 7 && $node[1]['type'] != 8){
                            $node['corner'] = 2; // CORNER POST
                        }
                    }
                }
            }
            $corners[] = $node;
        }
        foreach($corners as $corner){
            if(array_key_exists('corner', $corner)) {
                $postsCount[$corner['corner']] = $postsCount[$corner['corner']] + 1;
            }
        }
        $sections = [];
        /*
        $screws = [];
        for($i=1;$i<4;$i++) {
            $sections[$i] = ceil($mat_len[$i] / 6.0);
            $screws[$i] = ceil($mat_len[$i] / 100.0);
        }
        */
        $caps = 0;
        for($i=0;$i<5;$i++) {
            $caps = $caps + $postsCount[$i];
        }

        $panel_caps = 0;
        //$quote = "";
        $materials = ['mat_names'=>$mat_names, 'mat_heights'=>$mat_heights, 'mat_colors'=>$mat_colors, 'caps'=>$caps, 'sections'=>$sections, 'end_posts'=>$postsCount[0], 'linear_posts'=>$postsCount[1], 'corner_posts'=>$postsCount[2], 'gate_posts'=>$postsCount[3], 'blank_posts'=>$postsCount[4], 'hinges'=>$hinges, 'latches'=>$latches, 'rods'=>$rods, 'doors'=>$doors];
        if($panels6 > 0) {
            //$quote .= "[" . $panels6 . "] 6 FEET PANEL " . $mat_names[1] . "\n\n";
            $desc = "6 FEET PANEL " . $mat_names[1];
            $item = new Item($panels6, null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], '6 FT PANEL', $panels6));            
            if($pickets[1]){
                $panel_caps = $panel_caps + $panels6 * 10;
                $estimate->add($this->getOdooItem($mat_codes[1], 'PANEL_CAPS', $panels6 * 10));
            }
        }
        if($panels8 > 0) {
            //$quote .= "[" . $panels8 . "] 8 FEET PANEL " . $mat_names[1] . "\n\n";
            $desc = "8 FEET PANEL " . $mat_names[1];
            $item = new Item($panels8, null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], '8 FT PANEL', $panels8));
            if($pickets[1]){
                $panel_caps = $panel_caps + $panels8 * 13;
                $estimate->add($this->getOdooItem($mat_codes[1], 'PANEL_CAPS', $panels8 * 13));
            }
        }
        if($panel_caps > 0){
            $desc = "PANEL CAPS";
            $item = new Item($panel_caps, null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
        }
        if($postsCount[0] > 0) {
            //$quote .= "[" . $postsCount[0] . "] " . "END POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "END POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[0], null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'END POSTS', $postsCount[0]));
        }
        if($postsCount[1] > 0) {
            //$quote .= "[" . $postsCount[1] . "] " . "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "LINEAR POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[1], null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LINEAR POSTS', $postsCount[1]));
        }
        if($postsCount[2] > 0) {
            //$quote .= "[" . $postsCount[2] . "] " . "CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "CORNER POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[2], null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'CORNER POSTS', $postsCount[2]));
        }
        if($postsCount[3] > 0) {
            //$quote .= "[" . $postsCount[3] . "] " . "GATE POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "GATE POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[3], null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            //$estimate->add($this->getOdooItem($mat_codes[1], 'GATE POSTS', $postsCount[3]));
        }
        if($postsCount[4] > 0) {
            //$quote .= "[" . $postsCount[4] . "] " . "BLANK POSTS " . $mat_heights[1] . " " . $mat_colors[1] . "\n\n";
            $desc = "BLANK POSTS " . $mat_heights[1] . " " . $mat_colors[1];
            $item = new Item($postsCount[4], null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'BLANK POSTS', $postsCount[4]));
        }
        if($caps > 0){
            //$quote .= "[" . $caps . "] " . "POST CAPS " . $mat_colors[1] . "\n\n";
            $desc = "POST CAPS " . $mat_colors[1];
            $item = new Item($caps, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'POST CAPS', $caps));
        }

        // <<< 16/08/2025: Caso 133
        $totalPosts = $postsCount[0] + $postsCount[1] + $postsCount[2] + $postsCount[3] + $postsCount[4];
        if($totalPosts > 0 && $hasConcrete){
            $desc = "CONCRETE BAG";
            $quoteItems->add(new Item($totalPosts, null, null, null, null, null, null, $desc));
            $estimate->add($this->getOdooItem($mat_codes[1], 'CONCRETE', $totalPosts));

            // <<< 29/06/2026 : Pallet Fee por cada 30 sacos, se deja espacio de 1 en sort_order en BD después de CONCRETE
            if($totalPosts >= 30){
                $fees = floor($totalPosts / 30);
                $estimate->add($this->getOdooPalletFee($mat_codes[1], $fees));                
            }
            // 29/06/2006 >>>
        }
        // 16/08/2025 >>>

        $isRanch = false;
        if($edge['material'] < 4) { // Existing wall ocasionaba error
            $isRanch = ((int)substr($mat_codes[$edge['material']] . '', 1, 1)) == 4;
        }
        if($isRanch){
            $u_channels = 0;
        }
        if($u_channels > 0){
            if(!$semipriv[1]){
                //$quote .= "[" . $u_channels . "] " . "U CHANNELS" . "\n\n";
                $desc = "U CHANNELS";
                $item = new Item($u_channels, null, null, null, null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'U CHANNELS', $u_channels));
            }
        }

        // <<< 26/09/2025 : CASO 204 : se eliminan gatekits y se incluyen partes
        /*
        if($gate_kits > 0){
            //$quote .= "[" . $gate_kits . "] " . "GATE KIT " . $mat_colors[1] . "\n\n";
            $desc = "GATE KIT " . $mat_colors[1];
            $item = new Item($gate_kits, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
        }
        */
        if($panels6_doors > 0) {
            $desc = "6 FEET PANEL FOR DOORS " . $mat_names[1];
            $item = new Item($panels6_doors, null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], '6 FT PANEL', $panels6_doors)); 
        }
        if($panels8_doors > 0) {
            $desc = "8 FEET PANEL FOR DOORS " . $mat_names[1];
            $item = new Item($panels8_doors, null, null, $mat_colors[1], null, null, $mat_heights, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], '8 FT PANEL', $panels8_doors));
        }
        if($up_rights > 0){
            if(!$semipriv[1]){
                $desc = "UP RIGHTS " . $mat_colors[1];
                $item = new Item($up_rights, null, null, $mat_colors[1], null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'UP RIGHTS', $up_rights));
            }
        }
        if($up_rights_caps > 0){
            if(!$semipriv[1]){
                $desc = "UP RIGHT CAPS " . $mat_colors[1];
                $item = new Item($up_rights_caps, null, null, $mat_colors[1], null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'UP RIGHT CAPS', $up_rights_caps));
            }
        }
        // 26/09/2025 >>>
        if($stiffeners > 0){
            //$quote .= "[" . $stiffeners . "] " . "STIFFENER" . "\n\n";
            $desc = "STIFFENER";
            $item = new Item($stiffeners, null, null, null, null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'STIFFENER', $stiffeners));
        }
        if($gate_braces > 0){
            //$quote .= "[" . $gate_braces . "] " . "GATE BRACE" . "\n\n";
            if(!$semipriv[1]){
                $desc = "GATE BRACE";
                $item = new Item($gate_braces, null, null, null, null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'GATE BRACE', $gate_braces));
            }
        }

        if($hinges > 0){
            //$quote .= "[" . $hinges . "] " . "HINGE SET " . $mat_colors[1] . "\n\n";
            $desc = "HINGE SET " . $mat_colors[1];
            $item = new Item($hinges, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'HINGE SET', $hinges));
        }        
        if($latches > 0){
            //$quote .= "[" . $latches . "] " . "LATCH " . $mat_colors[1] . "\n\n";
            $desc = "LATCH " . $mat_colors[1];
            $item = new Item($latches, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'LATCH', $latches));
        }        
        if($rods > 0){
            //$quote .= "[" . $rods . "] " . "ROD " . $mat_colors[1] . "\n\n";
            $desc = "ROD " . $mat_colors[1];
            $item = new Item($rods, null, null, $mat_colors[1], null, null, null, $desc);
            $quoteItems->add($item);
            $estimate->add($this->getOdooItem($mat_codes[1], 'ROD', $rods));
        }
        if($screws > 0) {
            if(!$semipriv[1]){
                //$quote .= "[" . $screws . "] " . "SCREW FOR PVC " . $mat_colors[1] . "\n\n";
                $desc = "SCREW FOR PVC " . $mat_colors[1];
                $item = new Item($screws, null, null, $mat_colors[1], null, null, null, $desc);
                $quoteItems->add($item);
                $estimate->add($this->getOdooItem($mat_codes[1], 'SCREW FOR PVC', $screws));
            }
        }

        $mergedDoors = $this->mergeDoors($doors);
        foreach($mergedDoors as $door => $qty){
            //$quote .= "[1] " . $door . "\n\n";
            $quoteItems->add(new Item($qty, null, null, $mat_colors[1], null, null, null, $door));
        }

        $estimate = $estimate->updateIds();
        $estimate->addSections($mat_codes[1]);
        $estimate->sortItems();        
        session(['estimate' => $estimate->getItems() ]);
        session()->save(); // Force save (optional)
        
        //return $quote;
        return $quoteItems;
    }

    public function estimateSpecialtyDoors($items){
        $doorsItems = new Items();
        // ROLLING GATES
        $rolling_track_pipes_len = 0;
        $rolling_gate_kits = 0;
        $uniline_track_brackets = 0;

        // SLIDING GATES
        $al_v_track_len = 0;
        $steel_v_track_len = 0;
        $v_track_wheels = 0;
        $gate_guide_rollers = 0;

        // CANTILEVER GATES
        $rollers = 0;
        $heavy_duty_posts = 0;

        $rolling_len = 0;
        $sliding_len = 0;
        $cantilever_len = 0;
        foreach($items as $item){
            if($item->isDoor){
                switch($item->doorType){
                    case 1:
                        // ROLLING GATE
                        $rolling_len += $item->length;
                        if($item->isDouble){
                            $rolling_gate_kits += 2;
                            if($item->length <= 40){
                                //$rolling_track_pipes_len += $item->height * 4;
                                $rolling_track_pipes_len += ($item->length + 1) * 2;
                            }
                            else{
                                $uniline_track_brackets += 2;
                                //$rolling_track_pipes_len += $item->height * 5;
                                $rolling_track_pipes_len += ($item->length + 1) * 2;
                            }
                        }
                        else{
                            $rolling_gate_kits++;
                            if($item->length <= 20){
                                //$rolling_track_pipes_len += $item->height * 2;
                                $rolling_track_pipes_len += ($item->length + 1) * 2;
                            }
                            else{
                                $uniline_track_brackets += 2;
                                //$rolling_track_pipes_len += $item->height * 3;
                                $rolling_track_pipes_len += ($item->length + 1) * 2;
                            }
                        }
                        break;
                    case 2:
                        // SLIDING GATE
                        $sliding_len += $item->length;
                        if($item->isDouble){
                            $v_track_wheels += 2;
                            $gate_guide_rollers += 2;
                            if($item->length <= 36){
                                $al_v_track_len += $item->length * 4;
                            }
                            else{
                                $al_v_track_len += $item->length * 5;
                            }
                        }
                        else{
                            $v_track_wheels++;
                            $gate_guide_rollers++;
                            if($item->length <= 18){
                                $al_v_track_len += $item->length * 2;
                            }
                            else{
                                $al_v_track_len += $item->length * 3;
                            }
                        }
                        break;
                    case 3:
                        // CANTILEVER GATE
                        $cantilever_len += $item->length;
                        if($item->isDouble){
                            $rollers += 8;
                            //$heavy_duty_posts += $item->height * 4;
                            $heavy_duty_posts += $item->length * 4;
                        }
                        else{
                            $rollers += 4;
                            //$heavy_duty_posts += $item->height * 2;
                            $heavy_duty_posts += $item->length * 2;
                        }
                        break;
                }
            }
        }

        // ROLLING GATES
        if($rolling_track_pipes_len > 0) {
            $desc = "TRACK PIPES 21'";
            $item = new Item(ceil($rolling_track_pipes_len / 21.0), null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }
        if($rolling_gate_kits > 0) {
            $desc = "ROLLING GATE KIT";
            $item = new Item($rolling_gate_kits, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }
        if($uniline_track_brackets > 0) {
            $desc = "UNILINE TRACK BRACKETS";
            $item = new Item($uniline_track_brackets, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }

        // SLIDING GATES
        if($al_v_track_len > 0) {
            $desc = "ALUMINUM V-TRACK 18'";
            $item = new Item(ceil($al_v_track_len / 18.0), null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }
        if($v_track_wheels > 0) {
            $desc = "3 INCH V-TRACK WHEEL (PAIR)";
            $item = new Item($v_track_wheels, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }
        if($gate_guide_rollers > 0) {
            $desc = "GATE GUIDE ROLLER";
            $item = new Item($gate_guide_rollers, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }

        // CANTILEVER GATES
        if($heavy_duty_posts > 0) {
            $desc = "HEAVY DUTY POST";
            $item = new Item($heavy_duty_posts, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }
        if($rollers > 0) {
            $desc = "CANTILEVER ROLLERS";
            $item = new Item($rollers, null, null, null, null, null, null, $desc);
            $doorsItems->add($item);
        }

        return $doorsItems;
    }

    public function loadFile(Request $request)
    {
        // Validate the uploaded file
        $request->validate([
            'file' => 'required|file|mimes:txt,csv,json|max:2048',
        ]);

        // Handle the uploaded file
        if ($request->hasFile('file')) {
            // Retrieve the uploaded file
            $file = $request->file('file');

            // Get the file's content
            $fileContent = $file->get(); // Retrieves the file content as a string

            // Process the file content
            $data = null;

            if ($file->getClientOriginalExtension() === 'wfs') {
                // If it's a JSON file, decode it
                $data = Crypt::decrypt($fileContent);
                //$data = $fileContent;
            }

            // Return the processed result
            return response()->json([
                'message' => 'File processed successfully!',
                'data' => $data
            ]);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function loadTemplate($template){
        $path = resource_path() . '/templates/' . $template . ".wfs";

        $fileContent = file_get_contents($path);
        $data = Crypt::decrypt($fileContent);

        // Return the processed result
        return response()->json([
            'message' => 'File processed successfully!',
            'data' => $data
        ]);
    }

    public function saveFile($json){
        $options = session('materials');

        $timestamp = date('dmy_His');
        $filename = 'project_' . $timestamp . '.wfs';
        //$now = new DateTime();
        //$formattedTimestamp = $now->format('mdy_His');
        //$filename = 'project_' . $formattedTimestamp . '.wfs';

        file_put_contents($filename, Crypt::encrypt($json));
        //file_put_contents($filename, $json);

        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filename));

        readfile($filename);

        // Optionally, delete the file from the server after download
        unlink($filename);

        exit;
    }


    public function estimate($json){
        $options = session('materials');
        session(['sketch' => $json ]);

        $mat_names = [];
        $mat_heigths = [];
        $mat_colors = [];
        $mat_codes = [];
        $mat_keys = [];

        foreach($options as $key=>$value) {
            $mat_codes[$key] = $value['code'];
            $heightInfo = explode(" ", $value['height']);
            //$mat_heights[$key] = $value['height'];
            $mat_heights[$key] = $heightInfo[0];
            $material = substr($value['code'], 0, 1);
            $mat_keys[$key] = $material;

            /*
            if ($material == "4"){
                $mat_colors[$key] = $value['design'];
            }
            else {
                $mat_colors[$key] = $value['color'];
            }
            */
            $mat_colors[$key] = $value['color'];

            switch($material) {
                case "1": // Aluminio
                    $mat_names[$key] = $value['material']  . " " . $value['type'] . " " . $value['height'] . " " . $value['color']  . " " . $value['style'];
                    break;
                case "2": // Chain Link
                    $mat_names[$key] = $value['material']  . " " . $value['type'] . " " . $value['height'] . " " . $value['color'];
                    break;
                case "3": // Metal
                    $mat_names[$key] = $value['material']  . " " . $value['style'] . " " . $value['height'] . " " . $value['color'];
                    break;
                case "4": // Vinyl
                    $mat_names[$key] = $value['style'] . " " . $value['design'] . " " . $value['height'] . " " . $value['color'];
                    break;
            }
        }
        $data = json_decode($json, true);
        $nodes = [];
        $hasConcrete = false;
        foreach ($data as $key => $item) {
            if (isset($item['id']) && $item['id'] === 'concrete') {
                $hasConcrete = !empty($item['value']); // true or false
                unset($data[$key]); // remove from array
                break;
            }
        }
        session()->put('concrete', (bool) $hasConcrete);

        // Reindex array (optional but good practice)
        $data = array_values($data);

        /*
        echo print_r($data, true);
        echo print_r($nodes, true);
        echo print_r($postsCount, true);
        echo print_r($sections, true);
        */
        //echo print_r($materials, true);

        $quote = "";
        $items = new Items();
        if($mat_keys[1] == "1") {
            $items = $this->estimateAl($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete);
        }
        if($mat_keys[1] == "2") {
            $items = $this->estimateChainLink($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete);
        }
        if($mat_keys[1] == "3") {
            $items = $this->estimateMetal($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete);
        }
        if($mat_keys[1] == "4") {
            $items = $this->estimatePVC($data, $mat_names, $mat_heights, $mat_colors, $mat_codes, $hasConcrete);
        }
        
        $doorItems = $this->estimateSpecialtyDoors($items);
        $quote = $this->listItems($items);
        $quote .= $this->listItems($doorItems);

        //echo strtoupper($quote);
        //die;
        return response(strtoupper($quote), 200)
            ->header('Content-Type', 'text/plain');
    }


    /**
     * Recursive function to parse JSON and collect leaf nodes with their full paths.
     *
     * @param array $node The current node of the JSON tree.
     * @param string $path The current path of names leading to the node.
     * @param array $result Reference to the result array to collect data.
     */
    function extractFinalOptions($node, $path = "", &$result = [])
    {
        // Append current node's name to the path if it exists
        if (isset($node['name']) && !isset($node['responses'])) {
            $path = $path . ($path ? " / " : "") . $node['name'];
        }

        // If the node has "responses", process them recursively
        if (isset($node['responses']) && is_array($node['responses'])) {
            foreach ($node['responses'] as $response) {
                $this->extractFinalOptions($response, $path, $result);
            }
        }

        // If the node has "next", process it recursively
        if (isset($node['next'])) {
            $this->extractFinalOptions($node['next'], $path, $result);
        }

        // If it's a leaf node (no responses or next) and not a "question" node
        if (!isset($node['responses']) && !isset($node['next']) && isset($node['id']) && !str_ends_with($node['id'], "0")) {
            $result[$node['id']] = $path; // Add the code and path to the result
        }
    }

    function getMaterialsOptionsList()
    {
        // Load JSON data
        $jsonFilePath = $path = resource_path() . '/steps.json';
        $jsonData = json_decode(file_get_contents($jsonFilePath), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            die("Invalid JSON file: " . json_last_error_msg());
        }

        // Initialize the result array
        $result = [];
        // Start the recursive parsing
        foreach ($jsonData as $key => $node) {
            $this->extractFinalOptions($node, "", $result);
        }

        // Print the result
        foreach ($result as $code => $path) {
            echo "INSERT INTO wfs.material_options(code, description) VALUES ('$code','$path');";
            echo "</br>";
        }
    }


}
