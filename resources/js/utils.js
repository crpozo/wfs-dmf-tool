function gridlines(){
  buffer.textSize(fsGrid);
  buffer.background(220);
  buffer.stroke(30, 30, 30, 20);
  buffer.strokeWeight(2);
  count = 1;
  count2 = 1;
  for(var x=0;x<=_W;x=x+gridSpacing){
    buffer.line(x,0,x,_H);
    if(count == 1){
      buffer.strokeWeight(1);
    }
    else if(count == 10){
      buffer.textAlign(CENTER, TOP);
      buffer.text(count2*10, x+gridSpacing, 2);
      count2++;
      buffer.strokeWeight(2);
      count = 0;
    }
    count++;
  }
  buffer.strokeWeight(2);
  count = 1;
  count2 = 1;
  for(var y=0;y<=_H;y=y+gridSpacing){
    buffer.line(0,y,_W,y);
    if(count == 1){
      buffer.strokeWeight(1);
    }
    else if(count == 10){
      buffer.textAlign(LEFT, CENTER);
      buffer.text(count2*10, 2, y+gridSpacing);
      count2++;
      buffer.strokeWeight(2);
      count = 0;
    }
    count++;
  }
  stroke(0, 0, 0, 255);
}

function dimension(xo,yo,x,y){
    var po = pixelsToFt(xo,yo);
    var p = pixelsToFt(x,y);
    /*
    xo = po.x;
    yo = po.y;
    x = p.x;
    y = p.y;
    */
  
    d = sqrt(sq(p.x-po.x) + sq(p.y-po.y));
    d = round(d).toFixed(0);
    w = textWidth(d);
    
    signX = +1;
    signY = +1;
    xA = CENTER;
    yA = BOTTOM;
    //textAlign(CENTER, BOTTOM);
    if(x <= xo){
      yA = TOP;
      //textAlign(CENTER, TOP);
      signY = -1;
    }
    
    m = (xo-x)/(y-yo); 
    xp = (x+xo)/2;
    yp = (y+yo)/2;
    ang = abs(atan((y-yo)/(x-xo))*180/PI);
    
    x1 = sep / (sqrt(1+sq(m))) + xp;
    if(y < yo){
      x1 = xp - sep / (sqrt(1+sq(m)));
    }

    y1 = m * (x1 - xp) + yp;    
    if(y < yo){
      signX = -1;
    }
  
    if(y == yo){
      x1 = xp;
      y1 = yp - signY * sep;
    }
    
    x1 = x1 + ang/90 * (sep + w/4) * signX;
    y1 = y1 + ang/90 * (sep) * signY;
    
    let dim = new Dim(x1, y1, d, xA, yA, fontsize);
    dim.paint();
    return dim;  
}

function pixelsToFt(x,y){
  xft = round((x - toolbarWidth) / gridSpacing);
  yft = round(y / gridSpacing);
  return new Pt(xft, yft);
}

function ftToPixels(xft, yft){
  xp = toolbarWidth + xft * gridSpacing;
  yp = yft * gridSpacing;
  return new Pt(xp, yp);
}

function convertZoomLevel(x,y,fromZoomLevel,toZoomLevel){
  fromGridSpacing = (_W-toolbarWidth)/zoomLevels[fromZoomLevel];
  toGridSpacing = (_W-toolbarWidth)/zoomLevels[toZoomLevel];
  var xc = (x-toolbarWidth) * toGridSpacing/fromGridSpacing + toolbarWidth;
  var yc = y * toGridSpacing/fromGridSpacing;
  var p = new Pt(xc, yc);
  return p;
}

function setActual(vert){
  actual = vert;
  var po = ftToPixels(vert.x,vert.y);
  xo = po.x;
  yo = po.y;
}