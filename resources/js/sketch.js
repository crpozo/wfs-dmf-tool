let font,
  fontsize = 14;
let fsGrid = 10;
let xo, yo;
let shift = false;
let inic, actual;
let drawable = true;
let p_dest = null;
let sep = 7; // Separación de las dimensiones
let snapV = 10; // Distancia para snap de vértices en pixels
let snapE = 10; // Distancia para snap de edges
let vSize = 6; // Diámetro del vértice
let toolbarWidth = 60; //Ancho del toolbar
let cursorActual;
let toolActual;
let _W = 1200;
let _H = 800;
let fCode = 70;
let wCode = 87;
let wDoor = 10;
let buffer;

let zoomLevel = 3;
let zoomLevels = [50, 75, 100, 200, 300, 400, 500];
let zoomMin = 0;
let zoomMax = 6;
let gridSpacing = (_W-toolbarWidth)/zoomLevels[zoomLevel];
// ****
var graph;


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
  
  let btnFence = createImg('img/fence.png','Fence');
  btnFence.position(5, 60);
  btnFence.mousePressed(function(){ toolClick(1); });
  
  btnWall = createImg('img/wall.png','Existing Wall');
  btnWall.position(5, 120);
  btnWall.mousePressed(function(){ toolClick(2); });
  
  btnGate = createImg('img/gate.png','Erase');
  btnGate.position(5, 180);
  btnGate.mousePressed(function(){ toolClick(3); });
  
  btnEraser = createImg('img/eraser.png','Erase');
  btnEraser.position(5, 240);
  btnEraser.mousePressed(function(){ toolClick(4); });
  
  btnClear = createImg('img/clear.png','Clear');
  btnClear.position(5, 400);
  btnClear.mousePressed(function(){ clearSc(); });
}

function setup(){
  graph = new Graph();
  createCanvas(_W, _H);
  buffer = createGraphics(_W - toolbarWidth, _H);
  gridlines();
    
  textSize(fontsize);
  textAlign(RIGHT, TOP);
  cursorActual = CROSS;
  cursor(cursorActual);
  
  toolbar();
}

function toolClick(tool){
  //console.log(tool);
  toolActual = tool;
  //fill(200);
  switch(tool){
    case 1:
      cursorActual = CROSS;
      square(5, 60, 48);
      break;
    case 2:
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
  image(buffer, toolbarWidth, 0);
  if(graph.vertices.length > 0){
    graph.paint();
  }

  x = mouseX;
  y = mouseY;
  pixelsToFt(x,y);
  if(x < toolbarWidth){
    cursor(ARROW);  
  }
  else{
    if(toolActual == 1 || toolActual == 2){
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
    else
      if(toolActual == 3){
        graph.checkEdges(x,y,snapE);
    }
  }
}

function mouseReleased(){
  
  drawable = true;
  if(p_dest != null){
    //console.log(p_dest.x);
  }
}

function keyPressed() {
  //console.log(keyCode);
  shift = (keyCode == 16);
  if(keyCode == fCode){
    toolClick(1);
  }
  else if(keyCode == wCode){
    toolClick(2);
  }
  else if(keyCode == 27){
    //ESC
    actual = null;
  }
}

function keyReleased(){
  shift = false;
}

function doubleClicked(){
  actual = null;
}