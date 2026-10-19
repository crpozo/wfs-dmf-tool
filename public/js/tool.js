class Tool {
  constructor(x, y, w, h, val, img, tooltip, cur, shortcut) {
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
  }

  setFnc(fnc){
    this.fnc = fnc;
  }

  over() {
    if (mouseX > this.x && mouseX < this.x + this.w && mouseY > this.y && mouseY < this.y + this.h) {
      this.rollover = true;
      tooltipText(this.tooltip, toolbarWidth + 10, this.y);
    } else {
      this.rollover = false;
    }
  }

  setSelected(sel){
    this.selected = sel;
  }

  clicked() {
    var resp = false;
    if (mouseX > this.x && mouseX < this.x + this.w && mouseY > this.y && mouseY < this.y + this.h) {
      resp = true;
      if(this.fnc){
        this.fnc();
      }
      this.selected = true;
      switch(this.val){
          case types.FENCE:
              type = types.FENCE;
              break;
          case types.FENCE_2:
              type = types.FENCE_2;
              break;
          case types.WALL:
              type = types.WALL;
              break;
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
      this.selected = true;
      toolActual = this.val;
      cursorActual = this.cur;
      console.log("KEY", toolActual, cursorActual);
    }
    return resp;
  }

  show() {
    push();

    strokeWeight(0.1);
    stroke(0);
    if (this.selected) {
      fill(140);
    } else if (this.rollover) {
      fill(180);
    } else {
      fill(220);
    }
    rect(this.x, this.y, this.w, this.h);
    //this.img.position(this.x+1, this.y+1);
    image(this.img, this.x+1, this.y+1);
    //strokeWeight(1);
    //fill(0);
    pop();
  }

}
