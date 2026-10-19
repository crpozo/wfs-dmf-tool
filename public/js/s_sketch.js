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

let zoomLevel = 3;
let zoomLevels = [50, 75, 100, 200, 300, 400, 500];
let zoomMin = 0;
let zoomMax = 6;
let gridSpacing = 1; //(_W-toolbarWidth)/zoomLevels[zoomLevel];

// ****
var graph;
let tb;
let wDoor = 4;
let wSDoor = 4;
let wDDoor = 8;

var btnZoomIn, btnZoomOut;
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

function zoomOut(){
  if(zoomLevel < zoomMax){
    zoomLevel++;
    gridSpacing = (_W-toolbarWidth)/zoomLevels[zoomLevel];
  }
  gridlines();
  //console.log(zoomLevel);
}

function zoomIn(){
  if(zoomLevel > zoomMin){
    zoomLevel--;
    gridSpacing = (_W-toolbarWidth)/zoomLevels[zoomLevel];
  }
  gridlines();
  //console.log(zoomLevel);
}

function toolbar(){
  btnZoomIn = createImg('img/plus.png','plus');
  btnZoomIn.position(5, 0);
  btnZoomIn.mousePressed(function(){ zoomIn(); });
  btnZoomOut = createImg('img/minus.png','minus');
  btnZoomOut.position(30, 0);
  btnZoomOut.mousePressed(function(){ zoomOut(); });

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
  gridSpacing = 1; // (_W-toolbarWidth)/zoomLevels[zoomLevel];
  gridlines();

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
                if (toolActualGroup[2] == tools.GATE || toolActualGroup[2] == tools.DOUBLE || toolActualGroup[1] == tools.ERASER) {
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

                    pixelsToFt(x, y);
                    if (x < toolbarWidth) {
                        cursor(ARROW);
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
  if (canvasEnabled && !isToolTooltipPointerActive()) {
    tb.clicked();
  }
}

function mouseReleased(){
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
