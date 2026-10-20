class Tool {
  constructor(x, y, w, h, val, img, tooltip, cur, shortcut, group) {
    this.selected = false;
    this.rollover = false;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.val = val;
    //this.img = createImg(img,tooltip);
    this.img = loadImage(img);
    this.cur = cur;
    this.shortcut = shortcut;
    //this.img.mousePressed(this.clickT(this.val, this.cur));
    this.tooltip = tooltip;
    this.offsetX = 0;
    this.offsetY = 0;
    //this.group = toolsGroups[this.val];
    this.group = group;
  }

  setFnc(fnc){
    this.fnc = fnc;
  }

  over() {
    if (mouseX > this.x && mouseX < this.x + this.w && mouseY > this.y && mouseY < this.y + this.h) {
      this.rollover = true;
      showToolTooltip(this.tooltip, toolbarWidth + 10, this.y);
    } else {
      this.rollover = false;
      hideToolTooltip(this.tooltip);
    }
  }

  setSelected(sel){
    this.selected = sel;
  }

  clicked() {
    var resp = null;
    if (mouseX > this.x && mouseX < this.x + this.w && mouseY > this.y && mouseY < this.y + this.h) {
      resp = this;
      if(this.fnc){
        this.fnc();
      }

      var btnActual = tb.getButton(toolActualGroup[this.group]);
      if(btnActual){
          btnActual.setSelected(false);
      }
      this.selected = true;
      toolActualGroup[this.group] = this.val;
      switch(this.val){
          case types.FENCE:
              type = types.FENCE;
              toolActualGroup[2] = type;
              break;
          case types.FENCE_2:
              type = types.FENCE_2;
              toolActualGroup[2] = type;
              break;
          case types.FENCE_3:
              type = types.FENCE_3;
              toolActualGroup[2] = type;
              break;
          case types.WALL:
              type = types.WALL;
              toolActualGroup[2] = type;
              break;
          case tools.ERASER:
              toolActual = this.val;
              cursorActual = this.cur;
              setActual(null);
          case tools.ORTO:
              this.selected =  (ortoShift || shift);
          default:
              toolActual = this.val;
              cursorActual = this.cur;
      }

      //toolActual = this.val;
      //cursorActual = this.cur;
      //console.log("CLICK", toolActual, cursorActual);

    }
    return resp;
  }

  shortcutted(code) {
    var resp = false;
    if (this.shortcut == code) {
      resp = true;
      if(this.fnc){
        this.fnc();
      }
      this.selected = this.val == tools.ORTO ? (ortoShift || shift) : true;
      //toolActual = this.val;
      toolActualGroup[this.group] = this.val;
      cursorActual = this.cur;
      //console.log("KEY", toolActual, cursorActual);
    }
    return resp;
  }

  show() {
    push();

    // WFS brand: white tools, light-blue when selected, tinted on hover (Oct 2026 redesign)
    strokeWeight(1);
    if (this.selected) {
      stroke(46, 89, 193);
      fill(168, 197, 255);
    } else if (this.rollover) {
      stroke(38, 49, 102, 120);
      fill(232, 237, 250);
    } else {
      stroke(38, 49, 102, 60);
      fill(255);
    }
    rect(this.x+1, this.y+1, this.w-2, this.h-2, 8);
    //this.img.position(this.x+1, this.y+1);
    image(this.img, this.x+6, this.y+6, 28, 28);
    //strokeWeight(1);
    //fill(0);
    pop();
  }

}
