class Dim{

  constructor(x, y, texto, horAlign, verAlign, fs) {
    this.x = x;
    this.y = y;
    /*
    console.log(x + ", " + y);
    var p = pixelsToFt(x,y);
    this.x = p.x;
    this.y = p.y;
    console.log(this.x + ", " + this.y);
    */
    this.texto = texto;
    this.ref = texto;
    this.horAlign = horAlign;
    this.verAlign = verAlign;
    this.fs = fs;
    textSize(fs);
    this.width = textWidth(texto);
    this.zoomLevel = zoomLevel;
    this.linked = null;
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
    push();
    textAlign(this.horAlign, this.verAlign);
    textSize(this.fs);
    strokeWeight(0.5);
    if(zoomLevel == this.zoomLevel){
      text(this.texto, this.x, this.y);
    }
    else{
      var p = convertZoomLevel(this.x, this.y, this.zoomLevel, zoomLevel);
      //console.log(p.x,p.y);
      text(this.texto, p.x, p.y);
    }
    pop();
  }
}
