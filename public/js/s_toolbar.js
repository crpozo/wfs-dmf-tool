class Toolbar{
  createEnum(values) {
    const enumObject = {};
    let i = 0;
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
    for (const size of qtyBts) {
        for(let j=0;j < size;j++){
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

    let fncGate = function(){
        wDoor = wSDoor;
        toolClick(tools.GATE);
        document.getElementById("btnGate").click();
    };
    let fncDouble = function(){
        wDoor = wDDoor;
        toolClick(tools.DOUBLE);
        document.getElementById("btnDblGate").click();
    };
    let fncOrto = function(){
        ortoShift = !ortoShift;
        toolClick(tools.ORTO);
        let btnOrto = tb && tb.getButton ? tb.getButton(tools.ORTO) : null;
        if (btnOrto) {
            btnOrto.setSelected(ortoShift);
        }
    }

    let posX = 5;
    let posY = 0;
    for(let i=0;i < Object.keys(tools).length;i++){
      let btn = new Tool(posX, toolPos[posY], toolSize, toolSize, i, 'img/' + Object.keys(tools)[i].toLowerCase() + ".png", toolNames[i] + " (" + shortCuts[i] + ")", cursors[i], shortCutsCodes[i], toolsGroups[i]);
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
    let btnLine = new Tool(posX, toolPos[tools.LINE], 50, 50, tools.LINE, 'img/line.png', 'Line (L)', CROSS, 70);
    this.buttons.push(btnLine);
    //newText("LINE", 9, 25, 50);

    let btnRect = new Tool(posX, toolPos[tools.RECT], 50, 50, tools.RECT, 'img/rect.png', 'Rectangle (R)', CROSS, 70);
    this.buttons.push(btnRect);

    let btnEraser = new Tool(posX, toolPos[tools.ERASER], 50, 50, tools.ERASER, 'img/eraser.png', 'Eraser (E)', HAND, 69);
    this.buttons.push(btnEraser);

    let btnFence = new Tool(posX, toolPos[tools.FENCE], 50, 50, tools.FENCE, 'img/fence2.png', 'Fence (F)', CROSS, 70);
    btnFence.setSelected(type == types.FENCE);
    this.buttons.push(btnFence);

    let btnChannel = new Tool(posX, toolPos[tools.FENCE_2], 50, 50, tools.FENCE_2, 'img/channel.png', 'Fence Type 2 (C)', CROSS, 67);
    btnChannel.setSelected(type == types.FENCE_2);
    this.buttons.push(btnChannel);

    let btnWall = new Tool(posX, toolPos[tools.WALL], 50, 50, tools.WALL, 'img/wall.png', 'Existing Wall (W)', CROSS, 87);
    btnWall.setSelected(type == types.WALL);
    this.buttons.push(btnWall);

    let btnGate = new Tool(posX, toolPos[tools.GATE], 50, 50, tools.GATE, 'img/single_gate.png', 'Single Gate (G)', CROSS, 71);
    btnGate.setFnc(function(){
        wDoor = wSDoor;
        toolClick(tools.GATE);
        document.getElementById("btnGate").click();
    });
    this.buttons.push(btnGate);

    let btnDouble = new Tool(posX, toolPos[tools.DOUBLE], 50, 50, tools.DOUBLE, 'img/double_gate.png', 'Double Gate (D)', CROSS, 68);
    btnDouble.setFnc(function(){
        wDoor = wDDoor;
        toolClick(tools.DOUBLE);
        //document.getElementById("btnGate").click();
    });
    this.buttons.push(btnDouble);

    let btnOrto = new Tool(posX, toolPos[tools.ORTO], 50, 50, tools.ORTO, 'img/ortogonal.png', 'Orto', HAND, 0);
    this.buttons.push(btnOrto);

    let btnClear = new Tool(posX, toolPos[tools.BIN], 50, 50, tools.BIN, 'img/clear.png', 'Clear (X)', CROSS, 88);
    btnClear.setFnc(function(){ confirmClearSc(); });
    this.buttons.push(btnClear);
    */

    actual = tools.LINE;
    type = tools.FENCE;
    //btnLine.setSelected(true);
  }

  show(){
    for (const btn of this.buttons) {
      btn.show();
    }
  }

  over(){
    for (const btn of this.buttons) {
      btn.over();
    }
  }

  getButton(tipo){
      let btn = null;
      for(let i=0;i<this.buttons.length;i++){
          if(this.buttons[i].val == tipo){
              btn = this.buttons[i];
              break;
          }
      }
      return btn;
  }

  clicked(){


    for(let i=0;i<this.buttons.length;i++){
      let r = this.buttons[i].clicked();

      if(r != null){
          this.actual = this.buttons[i];
          for (const btn of this.buttons) {
              if(btn != r && r.group == btn.group) {
                  btn.setSelected(false);
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
          break; // one button per click; the old shared `var i` ended the loop here
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
    for (const btn of this.buttons) {
      let r = btn.shortcutted(code);
      if(r){
        if(this.actual && btn.group == 1){
          this.actual.setSelected(false);
          this.actual = btn;
        }
        break;
      }
    }
  }
}
