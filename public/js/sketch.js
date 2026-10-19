let font,
  fontsize = 14;
let fsGrid = 10;
let xo, yo;
let ortoShift = false;
let shift = false;
let inic, actual;
let drawable = true;
let p_dest = null;
let sep = 7; // Separación de las dimensiones
let snapV = 10; // Distancia para snap de vértices en pixels
let snapE = 10; // Distancia para snap de edges
let snapE_Eraser = 5; // Distancia para snap de edges al borrar
let vSize = 6; // Diámetro del vértice
let toolbarWidth = 60; //Ancho del toolbar
let cursorActual;
let toolActual;
let _W = 1200;
let _H = 800;
let buffer;

let zoomLevel = 3;
let zoomLevels = [50, 75, 100, 200, 300, 400, 500];
let zoomMin = 0;
let zoomMax = 6;
let gridSpacing = (_W-toolbarWidth)/zoomLevels[zoomLevel];
// ****
var graph;
let tb;
let wDoor = 4;
let wSDoor = 4;
let wDDoor = 10;

var btnZoomIn, btnZoomOut;

function preload() {
    btnZoomIn = createImg("/img/plus.png", "Zoom In");
    btnZoomOut = createImg("/img/minus.png", "Zoom Out");
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
let toolPos = [60,120,180,240,300,325,400];
let tools = createEnum(['FENCE', 'FENCE_2', 'WALL', 'GATE', 'DOUBLE', 'ERASER', 'ORTO', 'BIN']);


function clearSc(){
  actual = null;
  graph.clear();
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
  btnGate.mousePressed(function(){ toolClick(tools.GATE); });

  btnEraser = createImg('img/eraser.png','Erase');
  btnEraser.position(posX, toolPos[tools.ERASER]);
  btnEraser.mousePressed(function(){ toolClick(tools.ERASER); });

  btnClear = createImg('img/clear.png','Clear');
  btnClear.position(posX, toolPos[tools.BIN]);
  btnClear.mousePressed(function(){ clearSc(tools.BIN); });
}

function setup(){
  graph = new Graph();

  _W = windowWidth;
  _H = windowHeight-250;

  createCanvas(_W, _H);
  buffer = createGraphics(_W - toolbarWidth, _H);
  gridSpacing = (_W-toolbarWidth)/zoomLevels[zoomLevel];
  gridlines();

  textSize(fontsize);
  textAlign(RIGHT, TOP);
  cursorActual = CROSS;
  cursor(cursorActual);
  //toolbar();
  tb = new Toolbar();
  tb.show();
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
  strokeWeight(1);
  stroke(0);

  image(buffer, toolbarWidth, 0);
  if(graph.vertices.length > 0){
    graph.paint();
  }

  x = mouseX;
  y = mouseY;
  tb.over();
  tb.show();

  pixelsToFt(x,y);
  if(x < toolbarWidth){
    cursor(ARROW);
  }
  else{
    if(toolActual == tools.FENCE || toolActual == tools.FENCE_2 || toolActual == tools.WALL){
      cursor(cursorActual);

      if (drawable && mouseIsPressed) {
        drawable = false;
        xo = mouseX;
        yo = mouseY;

        if(actual){
          if(shift){
            var pActual = ftToPixels(actual.x, actual.y);
            if(abs(pActual.x-xo) > abs(pActual.y-yo)){
              yo = pActual.y
            }
            else{
              xo = pActual.x
            }
          }

          vertfin = graph.check(xo,yo,snapV);
          if(vertfin != null){
            graph.addEdge(actual, vertfin, toolActual);
            actual = null;
          }
          else{
            var v = graph.addVertex(xo,yo);
            //console.log(v.x, v.y);
            var edge = graph.addEdge(actual, v, toolActual);
            //actual = v;
            setActual(v);
          }
        }
        else{
          vertfin = graph.check(xo,yo,snapV);
          var v;
          if(vertfin != null){
            //actual = vertfin;
            //xo = vertfin.x;
            //yo = vertfin.y;
            setActual(vertfin);
          }
          else{
            v = graph.addVertex(xo,yo);
            //actual = v;
            setActual(v);
            v.paint();
          }

        }
      }
      else{
        if(actual){
          if(xo && mouseX > toolbarWidth){
            //var v = graph.addVertex(xo,yo);
            //v.paint();

            graph.check(x,y,snapV);

            if(shift){
              if(abs(x-xo) > abs(y-yo)){
                y = yo
              }
              else{
                x = xo
              }
            }
            ellipse(x, y, vSize, vSize);
            if(xo != x || yo != y){
              switch(this.type){
                case 1:
                  strokeWeight(1);
                  break;
                case 2:
                  strokeWeight(5);
                  break;
              }

              line(xo,yo,x,y);
              dimension(xo,yo,x,y);
            }
          }
        }
        else{
          graph.check(x,y,snapV);
        }
      }
    }
    else{
      if(toolActual == tools.GATE || toolActual == tools.DOUBLE){
        graph.checkEdges(x,y,snapE);
      }
      if(toolActual == tools.ERASER){
        graph.checkEdges(x,y,snapE_Eraser);
      }
    }
  }
}

function mousePressed() {
  tb.clicked();
}

function mouseReleased(){

  drawable = true;
  if(p_dest != null){
    //console.log(p_dest.x);
  }
}

function keyPressed() {
  console.log(keyCode);
  shift = ortoShift || (keyCode == 16);
  if(shift){
    tb.buttons[tools.ORTO].setSelected(true);
  }

  if(keyCode == 27){
    //ESC
    actual = null;
  }
  else{
    tb.shortcut(keyCode);
  }
  console.log(keyCode);
}

function keyReleased(){
  if(shift){
    shift = false;
    tb.buttons[tools.ORTO].setSelected(false);
  }
}

function doubleClicked(){
  actual = null;
}
