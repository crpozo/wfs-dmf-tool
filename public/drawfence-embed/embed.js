var materials = {!! json_encode($materials, JSON_HEX_TAG) !!};
        var quoteRequestSketchToLoad = {!! json_encode(session()->pull('quote_request_sketch_to_load'), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!};
function exportCanvasRegion(canvas, x, y, width, height) {
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;

            const ctx = tmpCanvas.getContext('2d');

            ctx.drawImage(
                canvas,
                x, y, width, height,
                0, 0, width, height
            );

            return tmpCanvas.toDataURL('image/png');
        }

        function exportSketchCanvasImage(canvas) {
            const logicalCanvasWidth = typeof _W === 'number' && _W > 0 ? _W : canvas.width;
            const logicalCanvasHeight = typeof _H === 'number' && _H > 0 ? _H : canvas.height;
            const scaleX = canvas.width / logicalCanvasWidth;
            const scaleY = canvas.height / logicalCanvasHeight;
            const logicalToolbarWidth = typeof toolbarWidth === 'number' ? toolbarWidth : 0;
            const scanStartX = Math.min(canvas.width, Math.max(0, Math.ceil(logicalToolbarWidth * scaleX)));
            const scanWidth = canvas.width - scanStartX;

            if (scanWidth <= 0 || canvas.height <= 0) {
                throw new Error('The drawable canvas area is empty.');
            }

            const context = canvas.getContext('2d');
            const pixels = context.getImageData(scanStartX, 0, scanWidth, canvas.height).data;
            const blackThreshold = 80;
            let minX = scanWidth;
            let minY = canvas.height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < scanWidth; x++) {
                    const pixelIndex = (y * scanWidth + x) * 4;
                    const red = pixels[pixelIndex];
                    const green = pixels[pixelIndex + 1];
                    const blue = pixels[pixelIndex + 2];
                    const alpha = pixels[pixelIndex + 3];

                    if (
                        alpha > 0
                        && red <= blackThreshold
                        && green <= blackThreshold
                        && blue <= blackThreshold
                    ) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX < 0 || maxY < 0) {
                return exportCanvasRegion(canvas, scanStartX, 0, scanWidth, canvas.height);
            }

            const marginX = Math.ceil(20 * scaleX);
            const marginY = Math.ceil(20 * scaleY);
            const cropX = Math.max(scanStartX, scanStartX + minX - marginX);
            const cropY = Math.max(0, minY - marginY);
            const cropRight = Math.min(canvas.width, scanStartX + maxX + 1 + marginX);
            const cropBottom = Math.min(canvas.height, maxY + 1 + marginY);
            const cropWidth = Math.max(1, cropRight - cropX);
            const cropHeight = Math.max(1, cropBottom - cropY);

            return exportCanvasRegion(canvas, cropX, cropY, cropWidth, cropHeight);
        }


$('#btnQuote').on('click', function (event) {
                event.preventDefault();

                const fenceCanvas = document.querySelector('canvas');

                if (!fenceCanvas) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                    return;
                }

                try {
                    sessionStorage.setItem('quoteCanvasImage', exportSketchCanvasImage(fenceCanvas));
                    window.location.href = @json(route('estimate.index'));
                } catch (error) {
                    console.error('Unable to capture fence sketch:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                }
            });

(function () {
    import("https://cdn.jsdelivr.net/npm/shepherd.js@13.0.0/dist/esm/shepherd.mjs").then(function (module) {
        const Shepherd = module.default;
const btnEstimate = document.getElementById("btnEstimate");
        let wasHidden = false; // Track if the button was initially hidden

        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-theme-arrows',
                scrollTo: true
            }
        });

        tour.addStep({
            title: "Welcome",
            //text: "This tour will guide you through the tools that allow you to make a sketch of your fence project to get an estimate.",
            text: "This guided tour will walk you through the tools needed to sketch your fence project and receive an accurate estimate.",
            attachTo: { element: "#btnHelp", on: "bottom" },
            buttons: [{ text: "Next", action: tour.next },
                      { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Canvas",
            //text: "This area is the canvas to draw the sketch of your fence project.",
            text: "This is your drawing canvas, where you can sketch your fence project using the tools on the left.",
            orphan: true,
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Draw Line",
            //text: "Use this to start draw a fence or wall section on your sketch. Click over the canvas at the start of the line and click again at the end of the line.",
            text: "Select this tool to draw a fence or wall section on your sketch. Click on the canvas to set the starting point, then click again to define the endpoint.",
            attachTo: { element: "#LineTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Draw Rectangle",
            //text: "Use this to draw a rectangular shape of fence or wall on your sketch. Click over the canvas to start the rectangle and then click again in the opposite corner position.",
            text: "Select this tool to draw a rectangular section of fence or wall. Click on the canvas to set one corner, then click again at the opposite corner to complete the shape.",
            attachTo: { element: "#RectangleTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Erase",
            //text: "Use this to erase a fence or wall section or gate from your sketch. Just put the cursor over the section or gate (it should turn red) and click to delete it.",
            text: "Use the eraser to remove a fence/wall section, or gate from your sketch. Hover over the item until it turns red, then click to delete it.",
            attachTo: { element: "#EraserTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Fence",
            //text: "When this control is selected, line and rectangle tools will be used to define Fence sections.",
            text: "When enabled, the line and rectangle tools will be used to define fence sections.",
            attachTo: { element: "#FenceTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Wall",
            //text: "When this control is selected, line and rectangle tools will be used to define Wall sections.",
            text: "When enabled, the line and rectangle tools will be used to define wall sections.",
            attachTo: { element: "#WallTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Gate",
            //text: "Use this button to include a Single Gate in a fence section of your sketch.",
            text: "Use this button to add a single gate to a fence section in your sketch.",
            attachTo: { element: "#GateTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Double Gate",
            //text: "Use this to include a Double Gate in a fence section of your sketch.",
            text: "Use this button to add a double gate to a fence section in your sketch.",
            attachTo: { element: "#DblGateTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Orthogonal",
            //text: "When this button is selected, the lines drawn in the sketch will be horizontal or vertical. You can press the SHIFT key in your keyboard while drawing for the same effect.",
            text: "When this option is selected, all lines drawn in the sketch will be restricted to horizontal or vertical. You can also hold the Shift key while drawing to achieve the same effect.",
            attachTo: { element: "#OrthogonalTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Clear Sketch",
            //text: "Use this to clear the sketch and start over.",
            text: "Use the trash can to clear your sketch and start over.",
            attachTo: { element: "#ClearTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Save Project",
            //text: "Click this button to save your sketch in a .wfs file, for future use.",
            text: "Click this button to save your sketch as a .WFS file for future use. This file format stores all details of your drawing, including fence sections, gates, and measurements, allowing you to reload and modify your project later.",
            attachTo: { element: "#btnSave", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Load Project",
            //text: "Click this button to load an existing .wfs file and load that sketch in the canvas.",
            text: "Click this button to load an existing .WFS file and restore your saved fence sketch on the canvas.",
            attachTo: { element: "#btnLoad", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Use Template",
            //text: "Click this button to load a generic sketch from a list of common fence projects.",
            text: "Click this button to load a generic sketch from a list of common fence projects, providing a quick starting point for your design.",
            attachTo: { element: "#btnTemplate", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Estimate Button",
            //text: "Once your sketch is ready, and all the dimensions are set, this button will show. Click it to get your estimate.",
            text: "Once your sketch is complete and all dimensions are set, this button will appear. Click it to generate your estimate.",
            attachTo: { element: "#btnEstimate", on: "left" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Done", action: tour.complete }],

            beforeShowPromise: () => {
                return new Promise((resolve) => {
                    // Check if the button was hidden before showing it
                    wasHidden = btnEstimate.style.display === "none";
                    if (wasHidden) {
                        btnEstimate.style.display = "block"; // Show button
                    }
                    resolve();
                });
            },
            when: {
                hide: () => {
                    if (wasHidden) {
                        btnEstimate.style.display = "none"; // Hide button again
                    }
                }
            }
        });

        tour.on("complete", () => {
            canvasEnabled = true;
            if (wasHidden) {
                btnEstimate.style.display = "none"; // Hide the button again
            }
        });

        tour.on("cancel", () => {
            canvasEnabled = true;
            if (wasHidden) {
                btnEstimate.style.display = "none";
            }
        });

        document.querySelector("#btnHelp").addEventListener("click", () => {
            canvasEnabled = false;
            tour.start();
        });
    }).catch(function (error) {
        console.error('Unable to load Shepherd:', error);
    });
})();

var mat_count = 1;
        var canvasEnabled = true;

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

        ['modalGates', 'modalDblGates'].forEach(function (modalId) {
            const gateModal = document.getElementById(modalId);

            gateModal.addEventListener('show.bs.modal', function () {
                canvasEnabled = false;
                drawable = false;
            });

            gateModal.addEventListener('hidden.bs.modal', function () {
                canvasEnabled = true;
                drawable = true;
            });

            ['pointerdown', 'mousedown', 'click'].forEach(function (eventName) {
                gateModal.addEventListener(eventName, function (event) {
                    event.stopPropagation();
                });
            });
        });

        var sDoorWidth = 4;

        function updateGateDisclaimer() {
            const selectedGateType = document.querySelector('#modalGates input[name="radioGate"]:checked');
            const selectedWidth = document.querySelector('#modalGates input[name="sDoorWidth"]:checked');
            const isStandardSwingGate = selectedGateType?.value === '0'
                && ['4', '5', '6'].includes(selectedWidth?.value);

            document.getElementById('gateDisclaimer').style.display = isStandardSwingGate ? 'none' : 'block';
        }

        function updateDblGateDisclaimer() {
            const selectedGateType = document.querySelector('#modalDblGates input[name="radioGate"]:checked');
            const selectedWidth = document.querySelector('#modalDblGates input[name="dDoorWidth"]:checked');
            const isStandardDoubleSwingGate = selectedGateType?.value === '0'
                && ['8', '10', '12'].includes(selectedWidth?.value);

            document.getElementById('dblGateDisclaimer').style.display = isStandardDoubleSwingGate ? 'none' : 'block';
        }

        function toggleDropdown() {
            const dropdown = document.getElementById('dropdownContent');
            dropdown.classList.toggle('hidden');
        }


        $(document).ready(function(){
            /*
            $('input.btn-check').click(function(){
                sDoorWidth = (this).attr('value');
            });
             */

            const canvasButtons = [];
            const btnSize = 53;
            const sepSize = 20;
            let startY = 108;

            // Define button labels
            const buttonLabels = ["Line", "Rectangle", "Eraser", "Sep1", "Fence", "Wall", "Sep2", "Gate", "DblGate", "Sep3", "Orthogonal", "Sep4", "Clear"];
            var posY = startY;
            // Generate canvas buttons dynamically
            buttonLabels.forEach((label, index) => {
                if(label.substr(0,3) == "Sep"){
                    posY = posY + sepSize;
                }
                else {
                    canvasButtons.push({
                        key: label,
                        x: 5, // X position of the buttons
                        y: posY,
                        width: btnSize,
                        height: btnSize,
                        label: label
                    });
                    posY = posY + btnSize;
                }
            });

            function createTooltipElement(buttonKey) {
                const button = canvasButtons[buttonKey];
                const $tooltip = $('<div>')
                    .attr('id', `${button.key}Tooltip`)
                    .css({
                        position: 'absolute',
                        top: `${button.y}px`,
                        left: `${button.x}px`,
                        width: `${button.width}px`,
                        height: `${button.height}px`,
                        background: 'rgba(0, 0, 0, 0)', // Transparent overlay to show area
                        zIndex: 1000,
                    });
                $('body').append($tooltip);
                return `#${buttonKey}Tooltip`;
            }
            Object.keys(canvasButtons).forEach((key) => createTooltipElement(key));



            $('.doorWidth').click(function(){
                $(this).closest('.btn-group').find('.active').removeClass("active");
                $(this).closest('.btn').addClass('active');
                wSDoor = this.value;
                wDoor = this.value;
            });

            $('#modalGates input[name="radioGate"], #modalGates input[name="sDoorWidth"]').on('change', updateGateDisclaimer);
            $('#modalGates').on('show.bs.modal', updateGateDisclaimer);

            $('.dDoorWidth').click(function(){
                $(this).closest('.btn-group').find('.active').removeClass("active");
                $(this).closest('.btn').addClass('active');
                wDDoor = this.value;
                wDoor = this.value;
            });

            $('#modalDblGates input[name="radioGate"], #modalDblGates input[name="dDoorWidth"]').on('change', updateDblGateDisclaimer);
            $('#modalDblGates').on('show.bs.modal', updateDblGateDisclaimer);


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

        function substituteDims_old(before, after){
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

        function substituteDims(before, after) {
            // Create a new map to store the updated entries.
            let updatedDimensions = new Map();

            // Iterate through the dimensions map.
            dimensions.forEach((values, keys) => {
                // Split the key by '+' to handle multipart keys.
                let dims = keys.split("+");
                let updatedKey = null;

                if (dims.length === 1) {
                    // Single dimension key, directly replace if it matches.
                    if (dims[0] === before) {
                        updatedKey = after;
                    }
                } else {
                    // Multi-part key, replace 'before' part wherever it appears.
                    updatedKey = dims.map(dim => (dim === before ? after : dim)).join("+");
                }

                // If there's an update, store it in the new map.
                if (updatedKey !== null) {
                    updatedDimensions.set(updatedKey, values);
                } else {
                    // Keep the original key if no change was made.
                    updatedDimensions.set(keys, values);
                }
            });

            // Replace the original dimensions map with the updated one.
            dimensions.clear();
            updatedDimensions.forEach((value, key) => dimensions.set(key, value));
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
            var lengthInput = document.getElementById("txtLength");
            var val = Number(lengthInput.value);

            if (!Number.isFinite(val) || val <= 0) {
                lengthInput.setCustomValidity('Length must be greater than zero.');
                lengthInput.reportValidity();
                return;
            }

            lengthInput.setCustomValidity('');
            document.getElementById("btnDim").click();
            var key = dimOver.texto; // dimOver.ref;

            if((key+"").includes("d")) {
                var delKey = dimOver.texto;
                dimensions.set(key, val);

                //dimOver.setTexto(val);
                graph.setDim(delKey, eval(val));

                recalculateDims(key, val);
                removeDimFromPanel(delKey);

                if (dimOver.linked != null) {
                    dimOver.linked.setTexto(document.getElementById("txtLength").value);
                }
            }
            else{
                graph.setDim(dimOver, val);
            }
            redrawing = true;
        });

        var dimsTable = document.getElementById('dynamic_field');
        dimsTable.addEventListener('keydown', function(event) {
            if (event.target.matches('input[id^="txt_"]') && event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission on Enter

                // Get all inputs that match the 'name^="d"' selector
                const inputs = dimsTable.querySelectorAll('input[id^="txt_"]');

                // Find the index of the current input
                const index = Array.from(inputs).indexOf(event.target);

                // If it's not the last input, focus the next one
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // If it's the last input, simulate a button click
                    $("#submitDims").click();
                }
            }
        });

        var modalBtnDimsOK = document.getElementById('btnDimsOK');
        modalBtnDimsOK.addEventListener('click', function (){
            function setDim(item) {
                if(item.value.trim() != "") {
                    var value = Number(item.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        item.setCustomValidity('Length must be greater than zero.');
                        item.reportValidity();
                        return;
                    }
                    item.setCustomValidity('');
                    graph.setDim(item.name, item.value);
                }
            }

            var dims = $("#formDims input").toArray();
            dims.forEach(setDim);

            $("#modalDims").hide();
        });

        var panelDimsSubmit = document.getElementById('submitDims');
        function requestSketchRedraw() {
            redrawing = true;

            if (typeof loop === 'function') {
                loop();
            }

            if (typeof redraw === 'function') {
                redraw();
            }

            window.requestAnimationFrame(function () {
                redrawing = true;

                if (typeof redraw === 'function') {
                    redraw();
                }
            });
        }

        panelDimsSubmit.addEventListener('click', function (){
            var removed = 0;
            function setDim(item) {
                if(item.value.trim() != "") {
                    var value = Number(item.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        item.setCustomValidity('Length must be greater than zero.');
                        item.reportValidity();
                        return;
                    }
                    item.setCustomValidity('');
                    graph.setDim(item.name, value);
                    recalculateDims(item.name, value);
                    dimensions.set(item.name, value);
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

            var dims = $("#panelDims .rowDim input:not(:button):not(:file)").toArray(); // $("#panelDims input").toArray();
            dims.forEach(setDim);
            /*
            if(removed == dims.length){
                $('#submitDims').css('display','none');
            }
             */
            //$('#dynamic_field').html("");
            requestSketchRedraw();
            //redrawing=true;
        });

        $('#btnEstimate').on('click', function(e) {
            e.preventDefault();

            Swal.fire({
                title: 'Add concrete',
                text: `Would you like to add concrete to the estimate?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, add it',
                cancelButtonText: 'No',
                reverseButtons: true,
                allowOutsideClick: false,     // Prevent closing by clicking outside
                backdrop: true,               // Ensures a full overlay layer
                didOpen: () => noLoop(),      // â›” Stop p5 from capturing clicks
                willClose: () => loop()       // âœ… Resume p5 when alert closes
            }).then((result) => {
                var data = graph.getData();
                if (result.isConfirmed) {
                    data.push({ id: "concrete", value: true });
                }
                else{
                    data.push({ id: "concrete", value: false });
                }
                var jsonStr = JSON.stringify(data);
                $.ajax({
                    type: "GET",
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: 'estimate/' + jsonStr,
                    success: function(msg){
                        $('#formEstimate').css('display','block');
                        $('#txtMaterials').val(msg);
                        //$('#fishbowlForm').css('display','block');
                        $('#btnEstimate').css('display','block');
                        $('#btnQuote').css('display','block');
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown) {
                    }
                });
            });
        });


        $('#fileInput').change(function() {
            var file = $(this).prop('files')[0];
            if (file) {
                var formData = new FormData();
                formData.append('file', file);

                $.ajax({
                    url: 'load', // URL to your file upload route
                    type: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    data: formData,
                    contentType: false,
                    processData: false,
                    success: function(response) {
                        clearSc();

                        buffer = createGraphics(_W - toolbarWidth, _H);
                        gridlines();

                        redrawing = true;
                        graph.setData(JSON.parse(response.data));

                    },
                    error: function(xhr, status, error) {
                        // Handle the error here
                        console.error(xhr.responseText);
                    }
                });
            }
        });

        function applySketchData(sketchData) {
            sketchData = (sketchData || []).filter(function (item) {
                return item
                    && Object.prototype.hasOwnProperty.call(item, 'node1')
                    && Object.prototype.hasOwnProperty.call(item, 'node2')
                    && Object.prototype.hasOwnProperty.call(item, 'x1')
                    && Object.prototype.hasOwnProperty.call(item, 'y1')
                    && Object.prototype.hasOwnProperty.call(item, 'x2')
                    && Object.prototype.hasOwnProperty.call(item, 'y2');
            });

            clearSc();

            buffer = createGraphics(_W - toolbarWidth, _H);
            gridlines();

            actual = null;
            dimOver = null;
            drawable = true;
            redrawing = true;
            graph.setData(sketchData);
        }

        function loadQuoteRequestSketchWhenReady() {
            if (!quoteRequestSketchToLoad) {
                return;
            }

            var attempts = 0;
            var timer = setInterval(function () {
                attempts++;

                if (typeof graph !== 'undefined' && graph && typeof graph.setData === 'function') {
                    clearInterval(timer);
                    applySketchData(quoteRequestSketchToLoad);
                    quoteRequestSketchToLoad = null;
                    return;
                }

                if (attempts > 50) {
                    clearInterval(timer);
                    console.error('Unable to auto-load quote request sketch: graph was not ready.');
                }
            }, 100);
        }

        loadQuoteRequestSketchWhenReady();

        $('#btnLoad').on('click', function(e) {
            e.preventDefault();
            $('#fileInput').click();
        });

        $('#btnSave').on('click', function(e) {
            e.preventDefault();
            var jsonStr = JSON.stringify(graph.getData());
            var url = 'save/' + jsonStr;

            fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                }
            })
                .then(response => response.blob())
                .then(blob => {
                    // Create a link element, set its href to a URL representing the blob, and trigger a download
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'project_' + new Date().toISOString().replace(/:/g, '-') + '.wfs';
                    link.click();
                })
                .catch(error => console.error('Error downloading the file:', error));
        });

        document.getElementById('modalTemplates').addEventListener('click', function(event) {
            event.stopPropagation(); // Stop the event from reaching the canvas
        });

        function loadTemplates(){
            canvasEnabled =false;
            document.getElementById("btnTemplates").click();
        }

        function loadTemplate(){
            document.getElementById("btnTemplates").click();
            var sel = $('#modalTemplates input:radio:checked')[0].value;
            $.ajax({
                url: 'template/' + sel, // URL to your file upload route
                type: 'GET',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                contentType: false,
                processData: false,
                success: function(response) {
                    clearSc();
                    graph.setData(JSON.parse(response.data));
                    canvasEnabled = true;
                },
                error: function(xhr, status, error) {
                    // Handle the error here
                    console.error(xhr.responseText);
                    canvasEnabled = true;
                }
            });
        }

        var modalBtnGateOK = document.getElementById('btnGateOK');
        modalBtnGateOK.addEventListener('click', function (){
            document.getElementById("btnGate").click();
            var sel = $('#modalGates input:radio:checked')[0].value;
            doorType = parseInt(sel);
            wSDoor = $("#sDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
            if(wSDoor == "0"){
                if($("#sDoorCustomWidth")[0].value.trim().length == 0){
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Custom Door Width Value',
                        text: 'Please enter a custom width before proceeding.',
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'small-swal',
                        }
                    }).then(() => {
                        document.getElementById("btnGate").click();
                    });
                }
                else {
                    wSDoor = $("#sDoorCustomWidth")[0].value;
                    wDoor = wSDoor;
                }
            }
        });

        var modalBtnDblGateOK = document.getElementById('btnDblGateOK');
        modalBtnDblGateOK.addEventListener('click', function (){
            document.getElementById("btnDblGate").click();
            var sel = $('#modalDblGates input:radio:checked')[0].value;
            doorType = parseInt(sel);
            wDDoor = $("#dDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
            if(wDDoor == "0"){
                if($("#dDoorCustomWidth")[0].value.trim().length == 0){
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Custom Door Width Value',
                        text: 'Please enter a custom width before proceeding.',
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'small-swal',
                        }
                    }).then(() => {
                        document.getElementById("btnDblGate").click();
                    });
                }
                else {
                    wDDoor = $("#dDoorCustomWidth")[0].value;
                    wDoor = wDDoor;
                }
            }
        });

        $('#sDoorCustomWidth').on('focus', function() {
            $('#sdoorCustom').prop('checked', true);
            $('#lblSCustom').addClass('active');
            $('.dwBtn').not('#lblSCustom').removeClass('active');
            updateGateDisclaimer();
        });

        $('#dDoorCustomWidth').on('focus', function() {
            $('#ddoorCustom').prop('checked', true);
            $('#lblDCustom').addClass('active');
            $('.dwBtn').not('#lblDCustom').removeClass('active');
            updateDblGateDisclaimer();
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

        // Jquery draggable
        $('.modal-dialog').draggable({
            handle: ".modal-header"
        });
        */

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

const toolHelpVideos = {
            default: @json(asset('vid/wfs.mp4')),
            Eraser: @json(asset('vid/erase.mp4')),
            Line: @json(asset('vid/draw.mp4')),
            Fence: @json(asset('vid/draw.mp4')),
            "Existing Wall": @json(asset('vid/wall.mp4')),
            "Single Gate": @json(asset('vid/gates.mp4')),
            "Double Gate": @json(asset('vid/gates.mp4')),
            Orto: @json(asset('vid/ortho.mp4')),
            "Load Project": @json(asset('vid/project.mp4')),
            "Save Project": @json(asset('vid/project.mp4')),
            "Use Template": @json(asset('vid/templates.mp4')),
        };

        const toolHelpVideoModal = document.getElementById('toolHelpVideoModal');
        const toolHelpVideoPlayer = document.getElementById('toolHelpVideoPlayer');
        const toolHelpVideoSource = toolHelpVideoPlayer.querySelector('source');
        const toolHelpVideoTitle = document.getElementById('toolHelpVideoTitle');
        const toolHelpVideoClose = document.getElementById('toolHelpVideoClose');

        function openToolHelpVideo(toolLabel) {            
            const toolName = toolLabel ? toolLabel.replace(/\s+\([^)]*\)$/, '') : 'Tool';
            const videoSource = toolHelpVideos[toolName] || toolHelpVideos.default;

            toolHelpVideoTitle.textContent = `${toolName} help video`;

            if (toolHelpVideoSource.getAttribute('src') !== videoSource) {
                toolHelpVideoSource.setAttribute('src', videoSource);
                toolHelpVideoPlayer.load();
            }

            toolHelpVideoModal.classList.add('is-open');
            toolHelpVideoModal.setAttribute('aria-hidden', 'false');
            toolHelpVideoPlayer.currentTime = 0;
            toolHelpVideoPlayer.play().catch(function () {});
        }

        const toolbarVideoTooltip = document.createElement('div');
        toolbarVideoTooltip.className = 'toolbar-video-tooltip';
        toolbarVideoTooltip.innerHTML = '<button type="button" class="toolbar-video-tooltip-help" aria-label="Watch help video">?</button>';
        document.body.appendChild(toolbarVideoTooltip);

        const toolbarVideoTooltipHelp = toolbarVideoTooltip.querySelector('.toolbar-video-tooltip-help');
        let activeToolbarHelpButton = null;
        let toolbarTooltipHideTimer = null;

        function positionToolbarVideoTooltip(button) {
            const buttonRect = button.getBoundingClientRect();
            const tooltipRect = toolbarVideoTooltip.getBoundingClientRect();
            const top = Math.max(8, Math.min(
                buttonRect.bottom + 6,
                window.innerHeight - tooltipRect.height - 8
            ));
            const left = Math.max(8, Math.min(
                buttonRect.right - tooltipRect.width,
                window.innerWidth - tooltipRect.width - 8
            ));

            toolbarVideoTooltip.style.top = `${top}px`;
            toolbarVideoTooltip.style.left = `${left}px`;
        }

        function showToolbarVideoTooltip(button) {
            clearTimeout(toolbarTooltipHideTimer);
            activeToolbarHelpButton = button;
            const label = button.dataset.toolbarHelpLabel || button.textContent.trim();
            toolbarVideoTooltipHelp.setAttribute('aria-label', `Watch ${label} help video`);
            toolbarVideoTooltip.classList.add('is-visible');
            positionToolbarVideoTooltip(button);
        }

        function scheduleToolbarVideoTooltipHide() {
            clearTimeout(toolbarTooltipHideTimer);
            toolbarTooltipHideTimer = setTimeout(function () {
                toolbarVideoTooltip.classList.remove('is-visible');
                activeToolbarHelpButton = null;
            }, 120);
        }

        document.querySelectorAll('[data-toolbar-help-video]').forEach(function (button) {
            button.addEventListener('pointerenter', function () {
                showToolbarVideoTooltip(button);
            });

            button.addEventListener('pointerleave', scheduleToolbarVideoTooltipHide);
        });

        toolbarVideoTooltip.addEventListener('pointerenter', function () {
            clearTimeout(toolbarTooltipHideTimer);
        });

        toolbarVideoTooltip.addEventListener('pointerleave', scheduleToolbarVideoTooltipHide);

        // The help control can overlap the p5 canvas in the compact embed.
        // Consume the press before p5 sees it and temporarily disable drawing.
        toolbarVideoTooltip.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });

        toolbarVideoTooltip.addEventListener('mousedown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });

        toolbarVideoTooltip.addEventListener('pointerup', function (event) {
            event.stopPropagation();
            releaseCanvasPointerInteraction();
        });

        toolbarVideoTooltip.addEventListener('pointercancel', function (event) {
            event.stopPropagation();
            releaseCanvasPointerInteraction();
        });

        toolbarVideoTooltipHelp.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (!activeToolbarHelpButton) {
                return;
            }

            toolbarVideoTooltip.classList.remove('is-visible');
            openToolHelpVideo(activeToolbarHelpButton.dataset.toolbarHelpVideo);
        });

        window.addEventListener('resize', function () {
            if (activeToolbarHelpButton && toolbarVideoTooltip.classList.contains('is-visible')) {
                positionToolbarVideoTooltip(activeToolbarHelpButton);
            }
        });

        function closeToolHelpVideo() {
            toolHelpVideoModal.classList.remove('is-open');
            toolHelpVideoModal.setAttribute('aria-hidden', 'true');
            toolHelpVideoPlayer.pause();
            toolHelpVideoPlayer.currentTime = 0;
        }

        toolHelpVideoModal.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });
        toolHelpVideoModal.addEventListener('mousedown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });
        toolHelpVideoClose.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event);
        });
        toolHelpVideoClose.addEventListener('mousedown', function (event) {
            suppressCanvasPointerInteraction(event);
        });
        toolHelpVideoClose.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeToolHelpVideo();
            releaseCanvasPointerInteraction();
        });
        toolHelpVideoModal.addEventListener('click', function (event) {
            if (event.target === toolHelpVideoModal) {
                event.preventDefault();
                event.stopPropagation();
                closeToolHelpVideo();
                releaseCanvasPointerInteraction();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && toolHelpVideoModal.classList.contains('is-open')) {
                closeToolHelpVideo();
            }
        });
