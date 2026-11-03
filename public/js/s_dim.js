class Dim{

  // (x, y) is where the label is painted, in pixels, at the moment of creation.
  // (ax, ay) is the pixel anchor the label hangs from (the segment midpoint): the
  // anchor is stored in model units and the gap to it in pixels, so the label
  // follows zoom and pan while keeping the same distance from its line.
  constructor(x, y, texto, horAlign, verAlign, fs, ax, ay) {
    if (ax == null || ay == null) {
      ax = x;
      ay = y;
    }
    this.anchor = pixelsToFt(ax, ay);
    this.dx = x - ax;
    this.dy = y - ay;
    this.x = x;
    this.y = y;
    this.texto = texto;
    this.ref = texto;
    this.horAlign = horAlign;
    this.verAlign = verAlign;
    this.fs = fs;
    textSize(fs);
    this.width = textWidth(texto);
    this.linked = null;
  }

  // Refresh the painted position from the anchor for the current zoom/pan.
  update(){
    var p = ftToPixels(this.anchor.x, this.anchor.y);
    this.x = p.x + this.dx;
    this.y = p.y + this.dy;
  }

  link(dim){
      if(this.linked == null) {
          this.linked = dim;
          dim.link(this);
      }
  }

  unlink(dim){
      if(this.linked != null){
          this.linked = null;
          dim.unlink(this);
      }
  }

  setTexto(texto){
    this.texto = texto;
  }

  setRef(ref){
      this.ref = ref;
  }

  over() {
    this.update();
    if (mouseX >= this.x - this.fs && mouseX <= this.x + this.fs*2 &&
        ((this.verAlign == TOP && mouseY >= this.y && mouseY <= this.y + this.fs) ||
            (mouseY >= this.y - this.fs && mouseY <= this.y)))
    {
        return this;
    } else {
        return null;
    }
  }

  paint(){
    this.update();
    push();
    textAlign(this.horAlign, this.verAlign);
    textSize(this.fs);
    strokeWeight(0.5);
    text(this.texto, this.x, this.y);
    pop();
  }
}
