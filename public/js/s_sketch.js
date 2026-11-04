let font,
  fontsize = 14;
let fsGrid = 10;
let xo, yo;
let ortogonal = false;
let shift = false;
let ortoShift = false;
let inic, actual;
let drawable = true;
let p_dest = null;
let sep = 7; // Separación de las dimensiones
let sep2 = 32; // Separación de las dimensiones segundo nivel
let snapV = 10; // Distancia para snap de vértices en pixels
let snapVCircle = 30; // Tamaño del círculo de Snapping en pixels
let snapE = 10; // Distancia para snap de edges
let snapE_Eraser = 5; // Distancia para snap de edges al borrar
let vSize =6; // Diámetro del vértice
let toolbarWidth = 50; //Ancho del toolbar
let cursorActual;
let toolActual;
let lineActual;
let _W = 1200;
let _H = 800;
let buffer;

// Zoom & pan. gridSpacing is the zoom scale (pixels per model unit, 1 = 100%)
// and panX/panY the viewport offset in pixels; both feed pixelsToFt/ftToPixels.
let gridSpacing = 1;
let panX = 0;
let panY = 0;
let zoomMin = 0.25;
let zoomMax = 5;
let zoomStep = 1.25;      // factor applied by the +/- buttons and keys
let zoomWheelStep = 1.1;  // factor applied per mouse-wheel notch
let zoomFitPadding = 40;  // pixels kept around the sketch by "Fit"
let panning = false;      // dragging the view (Space + drag or middle button)
let spaceDown = false;
let panLastX = 0;         // last pointer position used by the pan drag
let panLastY = 0;
let pinch = null;         // two-finger touch gesture in progress
let zoomControls = null;  // HTML overlay built by createZoomControls()

// ****
var graph;
let tb;
let wDoor = 4;
let wSDoor = 4;
let wDDoor = 8;

var modal = false;
let inputRow = "<tr id='%%%ROW_ID%%%' class='rowDim'><td><div id='formDimsRight'><div class='input-group'><span id='%%%ID%%%' class='input-group-text'>%%%D%%%</span><input id='%%%ID_TXT%%%' name='%%%NAME%%%' type='text' class='form-control' placeholder='Enter length' aria-label='Enter length' aria-describedby='basic-addon2'><span class='input-group-text' id='basic-addon2'>ft</span></div></div></td></tr>";
var redrawing = false;

const dimensions = new Map();

function preload() {
    //btnZoomIn = createImg("/img/plus.png", "Zoom In");
    //btnZoomOut = createImg("/img/minus.png", "Zoom Out");
}

function createEnum(values) {
  const enumObject = {};
  var i = 0;
  for (const val of values) {
    enumObject[val] = i;
    i++;
  }
  return Object.freeze(enumObject);
}
//let toolPos = [60,120,180,240,300,325,400];
//let tools = createEnum(['FENCE', 'FENCE_2', 'WALL', 'GATE', 'DOUBLE', 'ERASER', 'ORTO', 'BIN']);
let tools = createEnum(['LINE', 'RECT', 'ERASER', 'FENCE', 'FENCE_2', 'FENCE_3', 'WALL', 'GATE', 'DOUBLE', 'ORTO','BIN']);
let toolsGroups = [1, 1, 1, 2, 2, 2, 2, 1, 1, 3, 4];
let toolActualGroup = [0, 0, 0, 0, 0];

let toolNames = ['Line', 'Rectangle', 'Eraser', 'Fence', 'Fence Type 2', 'Fence Type 3', 'Existing Wall', 'Single Gate', 'Double Gate', 'Orto', 'Clear'];
let shortCuts = ['L','R','E','1','2','3','W','G','D','Shift','X'];
let shortCutsCodes = [76,82,69,49,50,51,87,71,68,16,88];

let types = createEnum(['DUMMY1', 'DUMMY2', 'DUMMY3', 'FENCE', 'FENCE_2', 'FENCE_3', 'WALL']);
let type = types.FENCE;

let doorTypes = createEnum( ['SWING_GATE', 'ROLLING_GATE', 'SLIDING_GATE', 'CANTILEVER_GATE']);
let doorType = doorTypes.SLIDING_GATE;

function clearSc(){
  actual = null;
  graph.clear();
  zoomReset();
  $('#dynamic_field').html("");
  dimensions.clear();
  $('#submitDims').css('display','none');
  $('#btnEstimate').css('display','none');
  $('#formEstimate').css('display','none');
  $('#btnQuote').css('display','none');
}

function confirmClearSc(){
  canvasEnabled = false;
  drawable = false;

  if (typeof Swal === 'undefined') {
    if (window.confirm('Clear the current sketch? This cannot be undone.')) {
      clearSc();
    }
    canvasEnabled = true;
    drawable = true;
    return;
  }

  Swal.fire({
    icon: 'warning',
    title: 'Clear Sketch?',
    text: 'This will remove everything from the drawing canvas.',
    showCancelButton: true,
    confirmButtonText: 'Clear',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    allowOutsideClick: false,
    didOpen: function () {
      noLoop();
    },
    willClose: function () {
      loop();
    }
  }).then(function (result) {
    if (result.isConfirmed) {
      clearSc();
    }

    var clearButton = tb && tb.getButton ? tb.getButton(tools.BIN) : null;
    if (clearButton) {
      clearButton.setSelected(false);
    }

    canvasEnabled = true;
    drawable = true;
  });
}

// ---------- Zoom & pan ----------

function zoomViewCenter(){
  return new Pt(toolbarWidth + (_W - toolbarWidth) / 2, _H / 2);
}

// Set the zoom scale keeping the model point under (cx, cy) fixed on screen.
function setZoom(scale, cx, cy){
  scale = constrain(scale, zoomMin, zoomMax);
  if (cx == null || cy == null) {
    var c = zoomViewCenter();
    cx = c.x;
    cy = c.y;
  }
  var ratio = scale / gridSpacing;
  panX = (cx - toolbarWidth) - ((cx - toolbarWidth) - panX) * ratio;
  panY = cy - (cy - panY) * ratio;
  gridSpacing = scale;
  afterViewChange();
}

function panBy(dx, dy){
  panX += dx;
  panY += dy;
  afterViewChange();
}

function zoomIn(cx, cy){
  setZoom(gridSpacing * zoomStep, cx, cy);
}

function zoomOut(cx, cy){
  setZoom(gridSpacing / zoomStep, cx, cy);
}

function zoomReset(){
  gridSpacing = 1;
  panX = 0;
  panY = 0;
  afterViewChange();
}

// Fit the whole sketch in the drawing area (or reset when it is empty).
function zoomToFit(){
  if (!graph || graph.vertices.length == 0) {
    zoomReset();
    return;
  }
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < graph.vertices.length; i++) {
    var v = graph.vertices[i];
    minX = min(minX, v.x); maxX = max(maxX, v.x);
    minY = min(minY, v.y); maxY = max(maxY, v.y);
  }
  var areaW = max(1, _W - toolbarWidth - 2 * zoomFitPadding);
  var areaH = max(1, _H - 2 * zoomFitPadding);
  var w = max(maxX - minX, 1);
  var h = max(maxY - minY, 1);
  gridSpacing = constrain(min(areaW / w, areaH / h), zoomMin, zoomMax);
  panX = (_W - toolbarWidth - w * gridSpacing) / 2 - minX * gridSpacing;
  panY = (_H - h * gridSpacing) / 2 - minY * gridSpacing;
  afterViewChange();
}

// Keep the in-progress line start in sync with the view and repaint.
function afterViewChange(){
  if (actual) {
    var po = ftToPixels(actual.x, actual.y);
    xo = po.x;
    yo = po.y;
  }
  redrawing = true;
  updateZoomControls();
}

function isOverDrawingArea(x, y){
  return x >= toolbarWidth && x <= _W && y >= 0 && y <= _H;
}

function isTypingInField(){
  var el = document.activeElement;
  return !!el && (el.tagName == 'INPUT' || el.tagName == 'TEXTAREA' || el.tagName == 'SELECT' || el.isContentEditable);
}

function startPan(){
  panning = true;
  panLastX = mouseX;
  panLastY = mouseY;
  drawable = false;
  cursor('grabbing');
}

function endPan(){
  if (panning) {
    panning = false;
    cursor(cursorActual);
  }
}

// HTML overlay (not painted on the canvas, so it never ends up in the exported
// sketch image). Lives in the canvas' parent element.
function createZoomControls(){
  if (zoomControls) {
    return;
  }
  var style = document.createElement('style');
  style.textContent =
    '.wfs-zoom-controls{position:absolute;right:12px;bottom:12px;z-index:5;display:flex;align-items:center;gap:2px;padding:3px;' +
      'border-radius:10px;background:var(--wfs-white,#fff);border:1px solid rgba(38,49,102,.25);box-shadow:0 2px 8px rgba(38,49,102,.15);' +
      'font-family:var(--wfs-font-sans,system-ui,sans-serif);user-select:none;-webkit-user-select:none;touch-action:manipulation}' +
    '.wfs-zoom-controls button{appearance:none;border:0;background:transparent;color:var(--wfs-ink,#263166);height:32px;min-width:32px;' +
      'padding:0 6px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font:inherit;font-size:14px;line-height:1}' +
    '.wfs-zoom-controls button:hover{background:#e8edfa}' +
    '.wfs-zoom-controls button:focus-visible{outline:2px solid #2e59c1;outline-offset:-2px}' +
    '.wfs-zoom-controls button svg{width:16px;height:16px;display:block}' +
    '.wfs-zoom-controls .wfs-zoom-level{min-width:52px;font-variant-numeric:tabular-nums;font-weight:600;font-size:13px}' +
    '.wfs-zoom-controls .wfs-zoom-sep{width:1px;height:20px;background:rgba(38,49,102,.2);margin:0 2px}' +
    '@media (max-width:600px){.wfs-zoom-controls{right:8px;bottom:8px}.wfs-zoom-controls button{height:36px;min-width:36px}}';
  document.head.appendChild(style);

  var svgMinus = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10"/></svg>';
  var svgPlus = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>';
  var svgFit = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/><rect x="5.5" y="5.5" width="5" height="5" rx="1"/></svg>';

  var box = document.createElement('div');
  box.className = 'wfs-zoom-controls';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Zoom');
  box.innerHTML =
    '<button type="button" data-zoom="out" title="Zoom out (-)" aria-label="Zoom out">' + svgMinus + '</button>' +
    '<button type="button" data-zoom="reset" class="wfs-zoom-level" title="Reset to 100% (0)" aria-label="Reset zoom">100%</button>' +
    '<button type="button" data-zoom="in" title="Zoom in (+)" aria-label="Zoom in">' + svgPlus + '</button>' +
    '<span class="wfs-zoom-sep" aria-hidden="true"></span>' +
    '<button type="button" data-zoom="fit" title="Fit sketch to view (F)" aria-label="Fit sketch to view">' + svgFit + '</button>';

  // Keep the canvas from reacting to clicks on the overlay (p5 listens on window).
  box.addEventListener('pointerdown', function (event) {
    suppressCanvasPointerInteraction(event, false);
  });
  box.addEventListener('pointerup', function () {
    releaseCanvasPointerInteraction();
  });
  box.addEventListener('wheel', function (event) {
    event.stopPropagation();
  });
  box.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-zoom]');
    if (!btn) {
      return;
    }
    event.preventDefault();
    switch (btn.getAttribute('data-zoom')) {
      case 'in': zoomIn(); break;
      case 'out': zoomOut(); break;
      case 'reset': zoomReset(); break;
      case 'fit': zoomToFit(); break;
    }
    btn.blur();
  });

  zoomControls = box;
  mountZoomControls();
  updateZoomControls();
}

// The layout adapter may move the canvas to another host after setup, so the
// overlay follows the canvas' current parent.
function mountZoomControls(){
  if (!zoomControls) {
    return;
  }
  var canvasEl = document.querySelector('canvas');
  var host = canvasEl ? canvasEl.parentElement : null;
  if (!host || host === document.body || zoomControls.parentElement === host) {
    return;
  }
  if (getComputedStyle(host).position == 'static') {
    host.style.position = 'relative';
  }
  host.appendChild(zoomControls);
}

function updateZoomControls(){
  if (!zoomControls) {
    return;
  }
  var label = zoomControls.querySelector('.wfs-zoom-level');
  if (label) {
    label.textContent = round(gridSpacing * 100) + '%';
  }
  var outBtn = zoomControls.querySelector('[data-zoom="out"]');
  var inBtn = zoomControls.querySelector('[data-zoom="in"]');
  if (outBtn) { outBtn.disabled = gridSpacing <= zoomMin + 0.0001; }
  if (inBtn) { inBtn.disabled = gridSpacing >= zoomMax - 0.0001; }
}

// Mouse wheel over the drawing area zooms around the pointer.
function mouseWheel(event){
  if (!canvasEnabled || modal || !isOverDrawingArea(mouseX, mouseY)) {
    return;
  }
  var canvasEl = document.querySelector('canvas');
  if (canvasEl && event.target && event.target !== canvasEl) {
    return;
  }
  var factor = event.delta > 0 ? 1 / zoomWheelStep : zoomWheelStep;
  setZoom(gridSpacing * factor, mouseX, mouseY);
  return false;
}

function mouseDragged(){
  if (panning) {
    // pmouseX/pmouseY only refresh once per frame, so track the drag ourselves.
    panBy(mouseX - panLastX, mouseY - panLastY);
    panLastX = mouseX;
    panLastY = mouseY;
    return false;
  }
}

// Two-finger touch: pinch to zoom, move both fingers to pan.
function touchStarted(){
  if (touches.length >= 2) {
    if (!pinch) {
      // The first finger may have just dropped a lone vertex: discard it.
      if (actual && graph.countEdgesVert(actual.id) == 0) {
        graph.removeVertex(actual);
        actual = null;
      }
      var a = touches[0], b = touches[1];
      pinch = {
        dist: max(1, dist(a.x, a.y, b.x, b.y)),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        scale: gridSpacing
      };
      drawable = false;
    }
    return false;
  }
  mousePressed();
}

function touchMoved(){
  if (pinch && touches.length >= 2) {
    var a = touches[0], b = touches[1];
    var d = max(1, dist(a.x, a.y, b.x, b.y));
    var cx = (a.x + b.x) / 2;
    var cy = (a.y + b.y) / 2;
    setZoom(pinch.scale * d / pinch.dist, pinch.cx, pinch.cy);
    panBy(cx - pinch.cx, cy - pinch.cy);
    pinch.cx = cx;
    pinch.cy = cy;
    return false;
  }
  if (pinch) {
    return false;
  }
  mouseDragged();
}

function touchEnded(){
  if (pinch) {
    if (touches.length == 0) {
      pinch = null;
      drawable = true;
    }
    return false;
  }
  mouseReleased();
}

function toolbar(){
  //btnFence.mousePressed(toolClick(1));
  var posX = 5
  //let btnFence = createImg('img/fence2.png','Fence');
  //btnFence.position(posX, toolPos[tools.FENCE]);
  //btnFence.mousePressed(function(){ toolClick(tools.FENCE); });
  btnFence = new Tool(posX, toolPos[tools.FENCE], 50, 50, tools.FENCE, 'img/fence2.png', 'Fence', CROSS);
  btnFence.show();

  btnChannel = createImg('img/channel.png','Fence Channel');
  btnChannel.position(posX, toolPos[tools.FENCE_2]);
  btnChannel.mousePressed(function(){ toolClick(tools.FENCE_2); });

  btnWall = createImg('img/wall.png','Existing Wall');
  btnWall.position(posX, toolPos[tools.WALL]);
  btnWall.mousePressed(function(){ toolClick(tools.WALL); });

  btnGate = createImg('img/gate.png','Gate');
  btnGate.position(posX, toolPos[tools.GATE]);
  btnGate.mousePressed(function(){
      toolClick(tools.GATE);
      document.getElementById("btnGate").click();
  });

  btnEraser = createImg('img/eraser.png','Erase');
  btnEraser.position(posX, toolPos[tools.ERASER]);
  btnEraser.mousePressed(function(){ toolClick(tools.ERASER); });

  btnClear = createImg('img/clear.png','Clear');
  btnClear.position(posX, toolPos[tools.BIN]);
  btnClear.mousePressed(function(){ confirmClearSc(); });
}

function setup(){
    /*
    console.log("windowWidth:", windowWidth);
    console.log("windowHeight:", windowHeight);
    console.log("window.innerHeight:", window.innerHeight);
    console.log("navbar height:", document.getElementById("navbar").offsetHeight);
    console.log("header height:", document.getElementById("header").offsetHeight);
    console.log("_W:", _W, " _H:", _H);
    */
   
  graph = new Graph();

  _W = windowWidth * 10/12;
  //_H = windowHeight - document.getElementById("navbar").clientHeight - document.getElementById("header").clientHeight;
  _H = window.innerHeight - document.getElementById("navbar").offsetHeight - document.getElementById("header").offsetHeight;

  $("#panelDims").css("max-height", _H + "px")

  createCanvas(_W, _H);
  buffer = createGraphics(_W - toolbarWidth, _H);
  gridlines();
  createZoomControls();

  textSize(fontsize);
  textAlign(RIGHT, TOP);
  cursorActual = CROSS;
  cursor(cursorActual);
  //toolbar();
  tb = new Toolbar();
  tb.show();
  toolActual = tools.LINE;
  toolActualGroup[1] = tools.LINE;
  toolActualGroup[2] = tools.FENCE;
}

function windowResized() {
    _W = windowWidth * 10/12;
    _H = window.innerHeight - document.getElementById("navbar").offsetHeight - document.getElementById("header").offsetHeight;

    buffer = createGraphics(_W - toolbarWidth, _H);
    gridlines();

    redrawing = true;
    resizeCanvas(_W, _H);
}

function toolClick(tool){
  //console.log(tool);
  toolActual = tool;
  //fill(200);
  switch(tool){
    case tools.FENCE:
      cursorActual = CROSS;
      square(5, 60, 48);
      break;
    case tools.WALL:
      cursorActual = CROSS;
      square(5, 120, 48);
      break;
    case 3:
      cursorActual = HAND;
      square(5, 180, 48);
      break;
    case 4:
      cursorActual = "img/eraser.png";
      square(5, 240, 48);
      break;
  }
  //noFill();
}

function draw() {
    if(canvasEnabled) {
        ortogonal = shift || ortoShift;

        if (redrawing || (mouseX <= _W && mouseX >= 0 && mouseY <= _H && mouseY >= 0)) {
            redrawing = false;
            if (!modal) {
                push();
                strokeWeight(1);
                stroke(0);

                image(buffer, toolbarWidth, 0);
                if (graph.vertices.length > 0) {
                    graph.paint();
                }

                // Al colocar puerta no debe contemplarse edición de dimensiones
                //if (toolActual == tools.GATE || toolActual == tools.DOUBLE || toolActual == tools.ERASER) {
                mountZoomControls();
                if (panning || spaceDown || pinch || toolActualGroup[2] == tools.GATE || toolActualGroup[2] == tools.DOUBLE || toolActualGroup[1] == tools.ERASER) {
                    dimOver = null;
                } else {
                    dimOver = graph.over();
                }
                if (dimOver != null) {
                    noFill();
                    stroke(50, 50, 255);
                    if (dimOver.verAlign == TOP) {
                        rect(dimOver.x - dimOver.fs, dimOver.y, dimOver.fs * 2, dimOver.fs);
                    } else {
                        rect(dimOver.x - dimOver.fs, dimOver.y - dimOver.fs, dimOver.fs * 2, dimOver.fs);
                    }
                }

                if (mouseIsPressed && !isToolTooltipPointerActive() && dimOver != null) {
                    actual = null;
                    toolActual = null;
                    document.getElementById("spDim").textContent = dimOver.texto;
                    document.getElementById("txtLength").value = "";
                    document.getElementById("btnDim").click();
                    modal = true;
                } else {

                    x = mouseX;
                    y = mouseY;
                    tb.over();
                    tb.show();

                    if (x < toolbarWidth) {
                        cursor(ARROW);
                    } else if (panning || spaceDown || pinch) {
                        // View is being moved: no drawing, just the pan cursor.
                        cursor(panning ? 'grabbing' : 'grab');
                    } else {
                        //  if (toolActual == tools.FENCE || toolActual == tools.WALL) {
                        //if (toolActual == tools.LINE) {
                        if (toolActualGroup[1] == tools.LINE) {
                            cursor(cursorActual);

                            if (drawable && mouseIsPressed && !isToolTooltipPointerActive()) {
                                drawable = false;
                                xo = mouseX;
                                yo = mouseY;

                                if (actual) {
                                    var pActual = ftToPixels(actual.x, actual.y);
                                    if (ortogonal) {
                                        if (abs(pActual.x - xo) > abs(pActual.y - yo)) {
                                            yo = pActual.y
                                        } else {
                                            xo = pActual.x
                                        }
                                    }

                                    // Keep the current starting point when both endpoints
                                    // are the same; zero-length sections are not valid.
                                    if (abs(pActual.x - xo) > 0.001 || abs(pActual.y - yo) > 0.001) {
                                        vertfin = graph.check(xo, yo, snapV);
                                        if (vertfin != null) {
                                            if (vertfin.x != actual.x || vertfin.y != actual.y) {
                                                //graph.addEdge(actual, vertfin, toolActual);
                                                graph.addEdge(actual, vertfin, type);
                                                actual = null;
                                            }
                                        } else {
                                            var v = graph.addVertex(xo, yo);
                                            //console.log(v.x, v.y);
                                            //var edge = graph.addEdge(actual, v, toolActual);
                                            var edge = graph.addEdge(actual, v, type);

                                            //actual = v;
                                            setActual(v);
                                        }
                                    }
                                } else {
                                    vertfin = graph.check(xo, yo, snapV);
                                    var v;
                                    if (vertfin != null) {
                                        //actual = vertfin;
                                        //xo = vertfin.x;
                                        //yo = vertfin.y;
                                        setActual(vertfin);
                                    } else {
                                        v = graph.addVertex(xo, yo);
                                        //actual = v;
                                        setActual(v);
                                        v.paint();
                                    }

                                }
                            } else {
                                if (actual) {
                                    if (xo && mouseX > toolbarWidth) {
                                        //var v = graph.addVertex(xo,yo);
                                        //v.paint();

                                        graph.check(x, y, snapV);

                                        if (ortogonal) {
                                            if (abs(x - xo) > abs(y - yo)) {
                                                y = yo
                                            } else {
                                                x = xo
                                            }
                                        }
                                        if (x - toolbarWidth > vSize) {
                                            ellipse(x, y, vSize, vSize);
                                        }
                                        if (xo != x || yo != y) {
                                            switch (this.type) {
                                                case types.FENCE:
                                                    strokeWeight(1);
                                                    break;
                                                case types.WALL:
                                                    strokeWeight(5);
                                                    break;
                                            }

                                            line(xo, yo, x, y);
                                            dimension(xo, yo, x, y);
                                        }
                                    }
                                } else {
                                    graph.check(x, y, snapV);
                                }
                            }
                        } else {
                            //if (toolActual == tools.GATE || toolActual == tools.DOUBLE) {
                            if (toolActualGroup[1] == tools.GATE || toolActualGroup[1] == tools.DOUBLE) {
                                graph.checkEdges(x, y, snapE);
                            }

                            //if (toolActual == tools.ERASER) {
                            if (toolActualGroup[1] == tools.ERASER) {
                                graph.checkEdges(x, y, snapE_Eraser);
                            }
                            //  if (toolActual == tools.FENCE_2) {
                            //if (toolActual == tools.RECT) {
                            if (toolActualGroup[1] == tools.RECT) {
                                if (drawable && mouseIsPressed && !isToolTooltipPointerActive()) {
                                    drawable = false;
                                    xo = mouseX;
                                    yo = mouseY;

                                    if (actual) {
                                        var pActual = ftToPixels(actual.x, actual.y);
                                        if (abs(pActual.x - xo) > 0.001 && abs(pActual.y - yo) > 0.001) {
                                            vertfin = graph.check(xo, yo, snapV);
                                            if (vertfin != null) {
                                                if (vertfin.x != actual.x || vertfin.y != actual.y) {
                                                    graph.addEdge(actual, vertfin, type);
                                                    actual = null;
                                                }
                                            } else {
                                                var v1 = graph.addVertex(xo, pActual.y);
                                                var v2 = graph.addVertex(pActual.x, yo);
                                                var v3 = graph.addVertex(xo, yo);
                                                var edge1 = graph.addEdge(actual, v1, type);
                                                var edge2 = graph.addEdge(v2, actual, type);
                                                var edge3 = graph.addEdge(v1, v3, type);
                                                var edge4 = graph.addEdge(v3, v2, type);
                                                if (type != types.WALL) {
                                                    edge1.link(edge4);
                                                    edge2.link(edge3);
                                                }
                                                actual = null;
                                            }
                                        }
                                    } else {
                                        vertfin = graph.check(xo, yo, snapV);
                                        var v;
                                        if (vertfin != null) {
                                            setActual(vertfin);
                                        } else {
                                            v = graph.addVertex(xo, yo);
                                            setActual(v);
                                            v.paint();
                                        }

                                    }
                                } else {
                                    if (actual) {
                                        if (xo && mouseX > toolbarWidth) {
                                            graph.check(x, y, snapV);
                                            if (x - toolbarWidth > vSize) {
                                                ellipse(x, y, vSize, vSize);
                                            }
                                            if (xo != x || yo != y) {
                                                switch (this.type) {
                                                    case 1:
                                                        strokeWeight(1);
                                                        break;
                                                    case 2:
                                                        strokeWeight(5);
                                                        break;
                                                }
                                                noFill();
                                                rect(xo, yo, (x - xo), (y - yo));
                                            }
                                        }
                                    } else {
                                        graph.check(x, y, snapV);
                                    }
                                }
                            }
                        }
                    }
                }
                pop();
            }
        }
    }
}

function mousePressed() {
  if (!canvasEnabled || isToolTooltipPointerActive()) {
    return;
  }
  if (mouseButton === RIGHT) {
    return;
  }
  // Middle button, or Space held, drags the view instead of drawing.
  if ((mouseButton === CENTER || spaceDown) && isOverDrawingArea(mouseX, mouseY)) {
    startPan();
    return false;
  }
  tb.clicked();
}

function mouseReleased(){
  endPan();
  if (!canvasEnabled) {
    return;
  }

  drawable = true;
  if(p_dest != null){
    //console.log(p_dest.x);
  }
}

function keyPressed() {
  //console.log(keyCode);

  if (isTypingInField()) {
    return;
  }
  if (keyCode == 32) {
    // Space: hold to pan with the mouse
    if (canvasEnabled && !modal) {
      spaceDown = true;
      return false;
    }
    return;
  }
  if (canvasEnabled && !modal) {
    if (key == '+' || key == '=') { zoomIn(); return false; }
    if (key == '-' || key == '_') { zoomOut(); return false; }
    if (key == '0') { zoomReset(); return false; }
    if (key == 'f' || key == 'F') { zoomToFit(); return false; }
  }

  shift = (keyCode == 16);
  /*
  if(shift){
    tb.buttons[tools.ORTO].setSelected(true);
  }
  */
  if(keyCode == 27){
    //ESC
    if(actual) {
        if (graph.countEdgesVert(actual.id) == 0) {
            graph.removeVertex(actual);
        }
        actual = null;
    }
  }
  else{
    tb.shortcut(keyCode);
  }
  //console.log(keyCode);
}

function keyReleased(){
  if (keyCode == 32) {
    spaceDown = false;
    endPan();
  }
  if(shift){
    shift = false;
    ortoShift = false;
    //tb.buttons[tools.ORTO].setSelected(false);
    tb.getButton(tools.ORTO).setSelected(false);
  }
}

function doubleClicked(){
  actual = null;
}
