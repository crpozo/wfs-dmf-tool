class Toolbar{
  createEnum(values) {
    const enumObject = {};
    var i = 0;
    for (const val of values) {
      enumObject[val] = i;
      i++;
    }
    return Object.freeze(enumObject);
  }

  constructor() {
    let toolSize = toolbarWidth - 10;
    let btnSize = toolSize + 3;
    let sepSize = 20;
    let qtyBts = [3, 2, 2, 1, 1];
    qtyBts[1] = mat_count + 1; //FENCES + WALL
    let top = 7;

    //let toolPos = [7,60,113,186,239,292,365,418,491,574];
    let toolPos = [];
    for(var i=0;i < qtyBts.length;i++){
        var size = qtyBts[i];
        for(var j=0;j < size;j++){
            toolPos.push(top);
            //console.log(top);
            top = top + btnSize;
        }
        top = top + sepSize;
    }

    this.actual = null;

    //this.tools = createEnum(['LINE', 'RECT', 'ERASER', 'FENCE', 'FENCE_2', 'WALL', 'GATE', 'DOUBLE', 'ORTO','BIN']);
    this.tools = tools;

    this.buttons = [];
    //this.types = createEnum(['FENCE', 'FENCE_2', 'WALL']);

    /*
    btnZoomIn.position(5, 245);
    btnZoomIn.mousePressed(function(){ zoomIn(); });
    btnZoomOut.position(30, 245);
    btnZoomOut.mousePressed(function(){ zoomOut(); });
    this.zoomIn = btnZoomIn;
    this.zoomOut = btnZoomOut;
    */

    let cursors = [CROSS, CROSS, HAND, CROSS, CROSS, CROSS, CROSS, CROSS, CROSS, HAND, CROSS];

    var fncGate = function(){
        wDoor = wSDoor;
        toolClick(tools.GATE);
        document.getElementById("btnGate").click();
    };
    var fncDouble = function(){
        wDoor = wDDoor;
        toolClick(tools.DOUBLE);
        document.getElementById("btnDblGate").click();
    };
    var fncOrto = function(){
        ortoShift = !ortoShift;
        toolClick(tools.ORTO);
        var btnOrto = tb && tb.getButton ? tb.getButton(tools.ORTO) : null;
        if (btnOrto) {
            btnOrto.setSelected(ortoShift);
        }
    }

    var posX = 5;
    var posY = 0;
    for(var i=0;i < Object.keys(tools).length;i++){
      var btn = new Tool(posX, toolPos[posY], toolSize, toolSize, i, 'img/' + Object.keys(tools)[i].toLowerCase() + ".png", toolNames[i] + " (" + shortCuts[i] + ")", cursors[i], shortCutsCodes[i], toolsGroups[i]);
      btn.setSelected(i==0 || type == i);
      switch(i){
          case tools.GATE:
              btn.setFnc(fncGate);
              break;
          case tools.DOUBLE:
              btn.setFnc(fncDouble);
              break;
          case tools.ORTO:
              btn.setFnc(fncOrto);
              break;
          case tools.BIN:
              btn.setFnc(function(){ confirmClearSc(); });
              break;
      }
      this.buttons.push(btn);
      if(i==tools.FENCE){
          i = i + (3-mat_count);
      }
      posY++;
    }

    /*
    var btnLine = new Tool(posX, toolPos[tools.LINE], 50, 50, tools.LINE, 'img/line.png', 'Line (L)', CROSS, 70);
    this.buttons.push(btnLine);
    //newText("LINE", 9, 25, 50);

    var btnRect = new Tool(posX, toolPos[tools.RECT], 50, 50, tools.RECT, 'img/rect.png', 'Rectangle (R)', CROSS, 70);
    this.buttons.push(btnRect);

    var btnEraser = new Tool(posX, toolPos[tools.ERASER], 50, 50, tools.ERASER, 'img/eraser.png', 'Eraser (E)', HAND, 69);
    this.buttons.push(btnEraser);

    var btnFence = new Tool(posX, toolPos[tools.FENCE], 50, 50, tools.FENCE, 'img/fence2.png', 'Fence (F)', CROSS, 70);
    btnFence.setSelected(type == types.FENCE);
    this.buttons.push(btnFence);

    var btnChannel = new Tool(posX, toolPos[tools.FENCE_2], 50, 50, tools.FENCE_2, 'img/channel.png', 'Fence Type 2 (C)', CROSS, 67);
    btnChannel.setSelected(type == types.FENCE_2);
    this.buttons.push(btnChannel);

    var btnWall = new Tool(posX, toolPos[tools.WALL], 50, 50, tools.WALL, 'img/wall.png', 'Existing Wall (W)', CROSS, 87);
    btnWall.setSelected(type == types.WALL);
    this.buttons.push(btnWall);

    var btnGate = new Tool(posX, toolPos[tools.GATE], 50, 50, tools.GATE, 'img/single_gate.png', 'Single Gate (G)', CROSS, 71);
    btnGate.setFnc(function(){
        wDoor = wSDoor;
        toolClick(tools.GATE);
        document.getElementById("btnGate").click();
    });
    this.buttons.push(btnGate);

    var btnDouble = new Tool(posX, toolPos[tools.DOUBLE], 50, 50, tools.DOUBLE, 'img/double_gate.png', 'Double Gate (D)', CROSS, 68);
    btnDouble.setFnc(function(){
        wDoor = wDDoor;
        toolClick(tools.DOUBLE);
        //document.getElementById("btnGate").click();
    });
    this.buttons.push(btnDouble);

    var btnOrto = new Tool(posX, toolPos[tools.ORTO], 50, 50, tools.ORTO, 'img/ortogonal.png', 'Orto', HAND, 0);
    this.buttons.push(btnOrto);

    var btnClear = new Tool(posX, toolPos[tools.BIN], 50, 50, tools.BIN, 'img/clear.png', 'Clear (X)', CROSS, 88);
    btnClear.setFnc(function(){ confirmClearSc(); });
    this.buttons.push(btnClear);
    */

    actual = tools.LINE;
    type = tools.FENCE;
    //btnLine.setSelected(true);
  }

  show(){
    for(var i=0;i<this.buttons.length;i++){
      this.buttons[i].show();
    }
  }

  over(){
    for(var i=0;i<this.buttons.length;i++){
      this.buttons[i].over();
    }
  }

  getButton(tipo){
      var btn = null;
      for(var i=0;i<this.buttons.length;i++){
          if(this.buttons[i].val == tipo){
              btn = this.buttons[i];
              break;
          }
      }
      return btn;
  }

  clicked(){


    for(var i=0;i<this.buttons.length;i++){
      var r = this.buttons[i].clicked();

      if(r != null){
          this.actual = this.buttons[i];
          for(var i=0;i<this.buttons.length;i++){
              if(this.buttons[i] != r && r.group == this.buttons[i].group) {
                  this.buttons[i].setSelected(false);
              }
          }
          if (r.val == tools.ORTO) {
              r.setSelected(ortoShift);
          }
          else if (r.val == tools.BIN) {
              r.setSelected(false);
          }
          else {
              r.setSelected(true);
          }
      }
      /*
      if(r){
        if(this.actual){
          this.actual.setSelected(false);
        }
        this.actual = this.buttons[i];
        break;
      }
       */
    }
  }

  shortcut(code){
    for(var i=0;i<this.buttons.length;i++){
      var r = this.buttons[i].shortcutted(code);
      if(r){
        if(this.actual && this.buttons[i].group == 1){
          this.actual.setSelected(false);
          this.actual = this.buttons[i];
        }
        break;
      }
    }
  }
}
