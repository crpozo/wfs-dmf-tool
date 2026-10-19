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
    this.horAlign = horAlign;
    this.verAlign = verAlign;
    this.fs = fs;
    textSize(fs);
    this.width = textWidth(texto);
    this.zoomLevel = zoomLevel;
  }
  
  paint(){
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
    //var p = ftToPixels(this.x, this.y);
    //text(this.texto, p.x, p.y);
  }
}