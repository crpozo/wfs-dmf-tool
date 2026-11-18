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
    let toolPos = [60,113,166,219,272,325,400,600];
    this.actual = null;

    this.tools = createEnum(['FENCE', 'FENCE_2', 'WALL', 'GATE', 'DOUBLE', 'ERASER', 'ORTO','BIN']);
    this.buttons = [];

    /*
    let btnZoomIn = createImg('img/plus.png','plus');
    btnZoomIn.position(5, 0);
    btnZoomIn.mousePressed(function(){ zoomIn(); });
    let btnZoomOut = createImg('img/minus.png','minus');
    btnZoomOut.position(30, 0);
    btnZoomOut.mousePressed(function(){ zoomOut(); });
     */
    btnZoomIn.position(5, 245);
    btnZoomIn.mousePressed(function(){ zoomIn(); });
    btnZoomOut.position(30, 245);
    btnZoomOut.mousePressed(function(){ zoomOut(); });

    this.zoomIn = btnZoomIn;
    this.zoomOut = btnZoomOut;

    let posX = 5
    let btnFence = new Tool(posX, toolPos[tools.FENCE], 50, 50, tools.FENCE, 'img/fence2.png', 'Fence (F)', CROSS, 70);
    this.buttons.push(btnFence);

    let btnChannel = new Tool(posX, toolPos[tools.FENCE_2], 50, 50, tools.FENCE_2, 'img/channel.png', 'Fence Near Channel (C)', CROSS, 67);
    this.buttons.push(btnChannel);

    let btnWall = new Tool(posX, toolPos[tools.WALL], 50, 50, tools.WALL, 'img/wall.png', 'Existing Wall (W)', CROSS, 87);
    this.buttons.push(btnWall);

    let btnGate = new Tool(posX, toolPos[tools.GATE], 50, 50, tools.GATE, 'img/single_gate.png', 'Single Gate (G)', CROSS, 71);
    btnGate.setFnc(function(){ wDoor = wSDoor; toolClick(tools.GATE); });
    this.buttons.push(btnGate);

    let btnDouble = new Tool(posX, toolPos[tools.DOUBLE], 50, 50, tools.DOUBLE, 'img/double_gate.png', 'Double Gate (D)', CROSS, 68);
    btnDouble.setFnc(function(){ wDoor = wDDoor; toolClick(tools.DOUBLE); });
    this.buttons.push(btnDouble);

    let btnEraser = new Tool(posX, toolPos[tools.ERASER], 50, 50, tools.ERASER, 'img/eraser.png', 'Erase (E)', HAND, 69);
    this.buttons.push(btnEraser);

    let btnOrto = new Tool(posX, toolPos[tools.ORTO], 50, 50, tools.ORTO, 'img/ortogonal.png', 'Orto', HAND, 0);
    this.buttons.push(btnOrto);

    let btnClear = new Tool(posX, toolPos[tools.BIN], 50, 50, tools.BIN, 'img/clear.png', 'Clear (X)', CROSS, 88);
    btnClear.setFnc(function(){ clearSc(tools.BIN); });
    this.buttons.push(btnClear);

  }

  show(){
    for(let i=0;i<this.buttons.length;i++){
      this.buttons[i].show();
    }
  }

  over(){
    for(let i=0;i<this.buttons.length;i++){
      this.buttons[i].over();
    }
  }

  clicked(){
    for(let i=0;i<this.buttons.length;i++){
      let r = this.buttons[i].clicked();
      if(r){
        if(this.actual){
          this.actual.setSelected(false);
        }
        this.actual = this.buttons[i];
        break;
      }
    }
  }

  shortcut(code){
    for(let i=0;i<this.buttons.length;i++){
      let r = this.buttons[i].shortcutted(code);
      if(r){
        if(this.actual){
          this.actual.setSelected(false);
        }
        this.actual = this.buttons[i];
        break;
      }
    }
  }
}
