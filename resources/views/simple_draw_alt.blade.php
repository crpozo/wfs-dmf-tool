<!DOCTYPE html>
<html lang="en">
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js"></script>
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.sound.min.js"></script> -->
    <link rel="stylesheet" type="text/css" href="css/style.css">
    <link rel="stylesheet" href="css/styles.css" />
    <link rel="stylesheet" href="/css/fontawesome.css" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link rel="stylesheet" href="/css/bootstrap.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <meta charset="utf-8" />

</head>
<body>

<button id="btnDim" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalDim" data-bs-whatever="@mdo">Dim</button>
<div class="modal fade" id="modalDim" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalLbl" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content" id="modalContentDim">
            <div class="modal-header">
                <h5 class="modal-title" id="modalLbl">Enter length</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <div class="input-group mb-3">
                            <span id="spDim" class="input-group-text">d</span>
                            <input id="txtLength" type="text" class="form-control" placeholder="Enter length" aria-label="Enter length" aria-describedby="basic-addon2">
                            <span class="input-group-text" id="basic-addon2">ft</span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer justify-content-between">
                <div class="col-1">
                    <!-- <button class="btn btn-warning float-left" data-bs-target="#modalDims" data-bs-toggle="modal" data-bs-dismiss="modal">List</button> -->
                    <!-- <button class="btn btn-warning float-left" onclick="loadDynamicContentModal()" data-bs-target="#modalDims" data-bs-toggle="modal" data-bs-dismiss="modal">List</button>-->

                </div>
                <div class="col-4">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="btnDimOK" type="button" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="modalDims" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalLbl" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalLbl">Enter length</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div id="formDims" class="mb-3">
                        <!--
                        <div class="input-group mb-3">
                            <span id="spDim" class="input-group-text">d</span>
                            <input id="txtLength" type="text" class="form-control" placeholder="Enter length" aria-label="Enter length" aria-describedby="basic-addon2">
                            <span class="input-group-text" id="basic-addon2">ft</span>
                        </div>
                        -->
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button id="btnDimsOK" type="button" class="btn btn-primary">OK</button>
            </div>
        </div>
    </div>
</div>

<button id="btnGate" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalGates" data-bs-whatever="@mdo">Gate</button>
<div class="modal fade" id="modalGates" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalGatesLbl" aria-hidden="true">
    <div class="modal-dialog" style="display:table;">
        <div class="modal-content" >
            <div class="modal-header">
                <h5 class="modal-title" id="modalGatesLbl">Select Gate Type</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="row mb-3">
                        <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                            <!--
                            <input type="radio" class="btn-check" name="radioGate" id="btnSwing" autocomplete="off" checked>
                            <label class="btn btn-outline-primary" for="btnSwing">Swing Gate</label>

                            <input type="radio" class="btn-check" name="radioGate" id="btnRolling" autocomplete="off">
                            <label class="btn btn-outline-primary" for="btnRolling">Rolling Gate</label>

                            <input type="radio" class="btn-check" name="radioGate" id="btnSliding" autocomplete="off">
                            <label class="btn btn-outline-primary" for="btnSliding">Sliding Gate</label>

                            <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" autocomplete="off">
                            <label class="btn btn-outline-primary" for="btnCantilever">Cantilever Gate</label>
                            -->
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnSwing" value="0" autocomplete="off" checked>
                                <img class="btn-door" src="img/Alum_Single_Swing_Gate.jpg" alt="Swing Gate">
                            </label>
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                <img class="btn-door"src="img/Alum_Sliding_Gate.jpg" alt="Sliding Gate">
                            </label>
                            @if($hayChain)
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnRolling" value="1" autocomplete="off">
                                <img class="btn-door" src="img/Alum_Rolling_Gate.jpg" alt="Rolling Gate">
                            </label>
                            @endif
                            @if($hayChain || $hayAl)
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                <img class="btn-door" src="img/Alum_Cantilever_Gate.jpg" alt="Cantilever Gate">
                            </label>
                            @endif
                        </div>
                    </div>
                    <div class="row mb-3">

                        <div class="btn-group" role="group" aria-label="Door Width">
                            <!--
                            <button type="button" class="btn btn-primary">4 FT</button>
                            <button type="button" class="btn btn-primary">5 FT</button>
                            <button type="button" class="btn btn-primary">6 FT</button>
                            <button type="button" class="btn btn-primary">CUSTOM</button>
                            -->


                            <label class="btn btn-primary dwBtn active">
                                <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor4" value="4" checked> 4 FT
                            </label>
                            <label class="btn btn-primary dwBtn">
                                <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor5" value="5"> 5 FT
                            </label>
                            <label class="btn btn-primary dwBtn">
                                <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor6" value="6"> 6 FT
                            </label>
                            <label class="btn btn-primary dwBtn text-end">
                                <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoorCustom" value="0"> CUSTOM:
                            </label>

                            <input type="text" id="sDoorCustomWidth" style="width:100px;" class="form-control" aria-label="Custom Width FT">
                            <span class="input-group-text">FT</span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button id="btnGateOK" type="button" class="btn btn-primary">OK</button>
            </div>
        </div>
    </div>
</div>

<button id="btnDblGate" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalDblGates" data-bs-whatever="@mdo">Double Gate</button>
<div class="modal fade" id="modalDblGates" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalDblGatesLbl" aria-hidden="true">
    <div class="modal-dialog" style="display:table;">
        <div class="modal-content" >
            <div class="modal-header">
                <h5 class="modal-title" id="modalDblGatesLbl">Select Gate Type</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="row mb-3">
                        <div class="btn-group" role="group" aria-label="Basic radio toggle button group">

                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnDblSwing" value="0" autocomplete="off" checked>
                                <img class="btn-door" src="img/Alum_Single_Swing_Gate.jpg" alt="Double Swing Gate">
                            </label>
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                <img class="btn-door"src="img/Alum_Sliding_Gate.jpg" alt="Sliding Gate">
                            </label>
                            @if($hayChain)
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnRolling" value="1" autocomplete="off">
                                <img class="btn-door" src="img/Alum_Rolling_Gate.jpg" alt="Rolling Gate">
                            </label>
                            @endif
                            @if($hayChain || $hayAl)
                            <label class="lbl-door">
                                <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                <img class="btn-door" src="img/Alum_Cantilever_Gate.jpg" alt="Cantilever Gate">
                            </label>
                            @endif
                        </div>
                    </div>
                    <div class="row mb-3">

                        <div class="btn-group" role="group" aria-label="Door Width">

                            <label class="btn btn-primary dwBtn active">
                                <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor8" value="8" checked> 8 FT
                            </label>
                            <label class="btn btn-primary dwBtn">
                                <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor10" value="10"> 10 FT
                            </label>
                            <label class="btn btn-primary dwBtn">
                                <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor12" value="12"> 12 FT
                            </label>
                            <label class="btn btn-primary dwBtn">
                                <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoorCustom" value="0"> CUSTOM
                            </label>

                            <input type="text" id="dDoorCustomWidth" style="width:100px;" class="form-control" aria-label="Custom Width FT">
                            <span class="input-group-text">FT</span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button id="btnDblGateOK" type="button" class="btn btn-primary">OK</button>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-10">
        <main>
        </main>
    </div>
    <div id="panelDims" class="col-2" style="overflow-y:scroll;">
        <form>
            <div class="table-responsive">
                <table class="table" id="dynamic_field">

                </table>
                <input type="button" name="submit" id="submitDims" style="display:none;" class="btn btn-info float-end" value="Update Layout" />
                <div class="d-flex justify-content-center">
                    <input type="button" name="estimate" id="btnEstimate" style="display:none;width:75%;" class="btn btn-warning orange" value="Get Estimate" />
                </div>
                <div class="form-group" id="formEstimate" style="display:none;">
                    <label style="margin-top:15px;" for="exampleFormControlTextarea1">Líneas Estimado</label>
                    <textarea style="height:590px;" class="form-control" id="exampleFormControlTextarea1" rows="10"></textarea>
                </div>
            </div>
        </form>
    </div>
</div>

<script
    src="https://code.jquery.com/jquery-3.7.1.min.js"
    integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
    crossorigin="anonymous"></script>
<script
    src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"
    integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU="
    crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>

<script>
    var materials = {!! json_encode($materials, JSON_HEX_TAG) !!};
</script>

<script>
    var mat_count = 1;
    if(materials){
        mat_count = Object.keys(materials).length;
    }
    var dimOver;
    var modalDim = document.getElementById('modalDim');
    modalDim.addEventListener('hidden.bs.modal', function (event) {
        modal = false;
    });

    modalDim.addEventListener('shown.bs.modal', function (event){
        document.getElementById('txtLength').focus();
    });

    var sDoorWidth = 4;

    $(document).ready(function(){
        $('input.btn-check').click(function(){
            sDoorWidth = (this).attr('value');
        });
        $('.doorWidth').click(function(){
            $(this).closest('.btn-group').find('.active').removeClass("active");
            $(this).closest('.btn').addClass('active');
            wSDoor = this.value;
            wDoor = this.value;
        });
        $('.dDoorWidth').click(function(){
            $(this).closest('.btn-group').find('.active').removeClass("active");
            $(this).closest('.btn').addClass('active');
            wDDoor = this.value;
            wDoor = this.value;
        });
    });

    function removeDimFromPanel(name){
        var txtDimMod = document.getElementsByName(name);
        if(txtDimMod != null && txtDimMod.length == 1){
            var row = txtDimMod[0].closest("tr");
            if(row) {
                row.remove();
                if(document.getElementsByClassName("rowDim").length == 0){
                    $('#submitDims').css('display','none');
                    $('#btnEstimate').css('display','block');
                }
            }
        }
    }

    function substituteDims(before, after){
        dimensions.forEach((values, keys) => {
            var dims = keys.split("+");
            if(dims.length == 1){
                if(dims[0] == before){
                    dimensions.set(after, dimensions.get(before));
                    dimensions.delete(before);
                }
            }
            else {
                dims.forEach((element) => {
                    if (element == before) {
                        var newKey = keys.replace(before + "+", after + "+");
                        if (newKey.substring(newKey.length - before.length - 1) == ("+" + before)) {
                            newKey = newKey.substring(0, newKey.length - before.length) + after;
                        }
                        dimensions.set(newKey, values);
                        dimensions.delete(keys);
                    }
                });
            }
        });
    }

    function recalculateDims(llave, valor){
        dimensions.forEach((values, keys) => {
            var dims = keys.split("+");
            dims.forEach((element) => {
                if(element == llave){
                    var newKey = keys.replace(llave + "+","");
                    if(newKey.substring(newKey.length - llave.length - 1) == ("+" + llave)){
                        newKey = newKey.substring(0, newKey.length - llave.length -1);
                    }
                    var newVal = values - valor;
                    if(newVal > 0) {
                        dimensions.set(newKey, newVal);
                        if (newKey.length < 5) {
                            graph.setDim(newKey, newVal);
                            removeDimFromPanel(newKey);
                        }
                    }
                    dimensions.delete(keys);
                }
            });
        });
    }

    var modalBtnOK = document.getElementById('btnDimOK');
    modalBtnOK.addEventListener('click', function (){
        document.getElementById("btnDim").click();
        var key = dimOver.texto; // dimOver.ref;
        var val = parseInt(document.getElementById("txtLength").value);
        var delKey = dimOver.texto;
        dimensions.set(key, val);

        dimOver.setTexto(val);
        recalculateDims(key, val);
        removeDimFromPanel(delKey);

        if(dimOver.linked != null){
            dimOver.linked.setTexto(document.getElementById("txtLength").value);
        }
        redrawing = true;
    });

    var modalBtnDimsOK = document.getElementById('btnDimsOK');
    modalBtnDimsOK.addEventListener('click', function (){
        function setDim(item) {
            if(item.value.trim() != "") {
                graph.setDim(item.name, item.value);
            }
        }

        var dims = $("#formDims input").toArray();
        dims.forEach(setDim);

        $("#modalDims").hide();
    });

    var panelDimsSubmit = document.getElementById('submitDims');
    panelDimsSubmit.addEventListener('click', function (){
        var removed = 0;
        function setDim(item) {
            if(item.value.trim() != "") {
                graph.setDim(item.name, eval(item.value));
                recalculateDims(item.name, eval(item.value));
                dimensions.set(item.name, eval(item.value));
                removeDimFromPanel(item.name);
                /*
                var row = item.closest("tr");
                if(row) {
                    row.remove();
                    removed++;
                }
                 */
            }
        }

        var dims = $("#panelDims input:not(:button)").toArray(); // $("#panelDims input").toArray();
        dims.forEach(setDim);
        /*
        if(removed == dims.length){
            $('#submitDims').css('display','none');
        }

         */
        //$('#dynamic_field').html("");
        redrawing = true;
    });

    $('#btnEstimate').on('click', function(e) {
        e.preventDefault();
        var jsonStr = JSON.stringify(graph.getData());
        $.ajax({
            type: "GET",
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            url: 'estimate/' + jsonStr,
            success: function(msg){
                $('#formEstimate').css('display','block');
                console.log(msg);
                $('#exampleFormControlTextarea1').val(msg);

            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
            }
        });
    });

    var modalBtnGateOK = document.getElementById('btnGateOK');
    modalBtnGateOK.addEventListener('click', function (){
        document.getElementById("btnGate").click();
        var sel = $('#modalGates input:radio:checked')[0].value;
        doorType = parseInt(sel);
        wSDoor = $("#sDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
    });

    var modalBtnDblGateOK = document.getElementById('btnDblGateOK');
    modalBtnDblGateOK.addEventListener('click', function (){
        document.getElementById("btnDblGate").click();
        var sel = $('#modalDblGates input:radio:checked')[0].value;
        doorType = parseInt(sel);
        wDDoor = $("#dDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
    });

    $("#modalDim").keypress(function(e)
    {
        if (e.which == 13) {
            modalBtnOK.click();
            return false;
        }
    });

    $('#txtLength').keypress(function (e) {
        var charCode = (e.which) ? e.which : event.keyCode
        if (String.fromCharCode(charCode).match(/[^0-9]/g))
            return false;
    });

    /*
    $('.modal').modal({ keyboard: false,
        show: true
    });
     */
    // Jquery draggable
    $('.modal-dialog').draggable({
        handle: ".modal-header"
    });

    function loadDynamicContentModal(modal) {
        var options = {
            modal : true,
            height : 300,
            width : 500
        };
        var dims = graph.getDims();
        var jsonDims = JSON.stringify(dims.sort(
            function(x,y){
                var valX = parseInt(x.substring(1));
                var valY = parseInt(y.substring(1));
                if (valX < valY) {
                    return -1;
                }
                if (valX > valY) {
                    return 1;
                }
                return 0;
            }

        ));


        $('#formDims').load('getDims/' + jsonDims,
            function() {
                /*
                $('#modalDims').modal({
                    show : true
                });

                 */
            });
    }

</script>
<script src="/js/s_utils.js"></script>
<script src="/js/s_tool.js"></script>
<script src="/js/s_toolbar.js"></script>
<script src="/js/s_dim.js"></script>
<script src="/js/s_edge.js"></script>
<script src="/js/s_vert.js"></script>
<script src="/js/s_graph.js"></script>
<script src="/js/point.js"></script>
<script src="/js/s_sketch.js"></script>

</body>
</html>
