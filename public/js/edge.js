class Edge{

  constructor(node1, node2, type) {
    this.node1 = node1;
    this.node2 = node2;
    this.type = type;
    this.length = sqrt(sq(node1.x-node2.x)+sq(node1.y-node2.y));
    this.dims = [];
    this.del = false;
    //console.log(this.node1.id, this.node2.id);

    if(node1.x == node2.x){
      this.m = 10000000;
      this.ms = 0;
    }
    else{
      this.m = (node2.y - node1.y) / (node2.x - node1.x);
      if(this.m == 0){
        this.ms = 10000000;
      }
      else{
        this.ms = -1/this.m;
      }
    }

    if(type == tools.GATE){
        var dx = (this.node2.x-this.node1.x)/this.length;
        var dy = (this.node2.y-this.node1.y)/this.length;
        this.x3 = this.node1.x+this.length*dx*sqrt(2)/2-this.length*dy*sqrt(2)/2;
        this.y3 = this.node1.y+this.length*dy*sqrt(2)/2+this.length*dx*sqrt(2)/2;
    }
    if(type == tools.DOUBLE){
        var dx = ((this.node2.x+this.node1.x)/2 - this.node1.x) / (w/2);
        var dy = ((this.node2.y+this.node1.y)/2 - this.node1.y) / (w/2);
        this.x3 = this.node1.x + (w/2) * dx * sqrt(2) / 2 - (w/2) * dy * sqrt(2) / 2;
        this.y3 = this.node1.y + (w/2) * dy * sqrt(2) / 2 + (w/2) * dx * sqrt(2) / 2;

        /*
        dx = (this.node2.x - (this.node2.x+this.node1.x)/2) / (w/2);
        dy = (this.node2.y - (this.node2.y+this.node1.y)/2) / (w/2);
        this.x4 = this.node2.x - (w/2) * dx * sqrt(2) / 2 - (w/2) * dy * sqrt(2) / 2;
        this.y4 = this.node2.y + (w/2) * dy * sqrt(2) / 2 + (w/2) * dx * sqrt(2) / 2;
        */
        var dw = this.length * (sqrt(2) - 1) / sqrt(2);
        this.x4 = this.x3 + dw / (sqrt(1 + sq(this.m)));
        this.y4 = this.y3 + this.m * dw / (sqrt(1 + sq(this.m)));
    }

    this.b = node1.y - this.m * node1.x;

    if(node2.x < node1.x){
      this.xMin = node2.x;
      this.xMax = node1.x;
    }
    else{
      this.xMin = node1.x;
      this.xMax = node2.x;
    }
    this.yMin = node1.y;
    if(node2.y < node1.y){
      this.yMin = node2.y;
      this.yMax = node1.y;
    }
    else{
      this.yMin = node1.y;
      this.yMax = node2.y;
    }
    this.vertical = abs(node1.y-node2.y) > abs(node1.x-node2.x);
    this.setDim();
  }

  setDim(){
    var p1 = ftToPixels(this.node1.x,this.node1.y);
    var p2 = ftToPixels(this.node2.x,this.node2.y);

    //var dim = dimension(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
    var dim = dimension(p1.x,p1.y,p2.x,p2.y);
    this.addDim(dim);
  }

  proj(x,y){
    var q = pixelsToFt(x,y);

    let bs = q.y - this.ms * q.x;
    let x2 = (bs - this.b) / (this.m - this.ms);
    let y2 = this.m * x2 + this.b;

    return new ftToPixels(x2,y2);
  }

  distance(x,y){
    let bs = y - this.ms * x;
    let x2 = (bs - this.b) / (this.m - this.ms);
    let y2 = this.m * x2 + this.b;
    let d=sqrt(sq(x2-x) + sq(y2-y));
    if(d < snapE){
      if(((x2>=this.xMin && x2<=this.xMax) || this.ms == 0) &&
         y2>=this.yMin && y2<=this.yMax){
        ellipse(x2, y2, 5, 5);
      }
    }
    return d;
  }

  clearDims(){
    this.dims = [];
  }

  addDim(dim){
      if(dim != null){
          this.dims.push(dim);
      }
  }

  setDel(del){
    this.del = del;
  }

  check(x,y,d){
    var r = false;
    var pt = this.proj(x,y);
    var x1 = pt.x;
    var y1 = pt.y;

    var dist=sqrt(sq(x1-x) + sq(y1-y));
    if(dist < d){
      var pmin = ftToPixels(this.xMin, this.yMin);
      var pmax = ftToPixels(this.xMax, this.yMax);
      if(toolActual == tools.GATE || toolActual == tools.DOUBLE){
        if(((x1>=pmin.x && x1<=pmax.x) || this.ms == 0) && y1>=pmin.y && y1<=pmax.y){
          var p1;
          var p2;
          if(this.ms == 0){
              if (this.node1.y < this.node2.y) {
                  p1 = ftToPixels(this.node1.x, this.node1.y);
                  p2 = ftToPixels(this.node2.x, this.node2.y);
              } else {
                  p2 = ftToPixels(this.node1.x, this.node1.y);
                  p1 = ftToPixels(this.node2.x, this.node2.y);
              }
          }
          else {
              if (this.node1.x < this.node2.x) {
                  p1 = ftToPixels(this.node1.x, this.node1.y);
                  p2 = ftToPixels(this.node2.x, this.node2.y);
              } else {
                  p2 = ftToPixels(this.node1.x, this.node1.y);
                  p1 = ftToPixels(this.node2.x, this.node2.y);
              }
          }
          var w = wDoor * gridSpacing;
          var x2 = x1 + w / (sqrt(1 + sq(this.m)));
          var y2 = y1 + this.m * w / (sqrt(1 + sq(this.m)));

          if(this.ms == 0){
              x2 = x1;
          }

          if (x2 <= pmax.x || (this.ms == 0 && y2 >= pmin.y && y2 <= pmax.y && y1 >= pmin.y && y1 <= pmax.y)) {
              r = true;
              ellipse(x1, y1, 5, 5);
              this.clearDims();
              ellipse(x2, y2, 5, 5);

              // Puerta
              if(toolActual == tools.GATE) {
                  var dx = (x2 - x1) / w;
                  var dy = (y2 - y1) / w;
                  var x3 = x1 + w * dx * sqrt(2) / 2 - w * dy * sqrt(2) / 2;
                  var y3 = y1 + w * dy * sqrt(2) / 2 + w * dx * sqrt(2) / 2;
                  line(x1, y1, x3, y3);
              }
              else{ //DOUBLE
                  var dx = ((x2+x1)/2 - x1) / (w/2);
                  var dy = ((y2+y1)/2 - y1) / (w/2);
                  var x3 = x1 + (w/2) * dx * sqrt(2) / 2 - (w/2) * dy * sqrt(2) / 2;
                  var y3 = y1 + (w/2) * dy * sqrt(2) / 2 + (w/2) * dx * sqrt(2) / 2;
                  line(x1, y1, x3, y3);

                  /*
                  dx = (x2 - (x2+x1)/2) / (w/2);
                  dy = (y2 - (y2+y1)/2) / (w/2);
                  var x4 = x2 + (w/2) * dx * sqrt(2) / 2 - (w/2) * dy * sqrt(2) / 2;
                  var y4 = y2 - (w/2) * dy * sqrt(2) / 2 - (w/2) * dx * sqrt(2) / 2;
                  line(x2, y2, x4, y4);
                   */
                  var dw = w * (sqrt(2) - 1) / sqrt(2);
                  var x4 = x3 + dw / (sqrt(1 + sq(this.m)));
                  var y4 = y3 + this.m * dw / (sqrt(1 + sq(this.m)));
                  line(x2, y2, x4, y4);
              }

              this.addDim(dimension(p1.x, p1.y, x1, y1));
              this.addDim(dimension(x1, y1, x2, y2));
              this.addDim(dimension(x2, y2, p2.x, p2.y));
          }
        }
      }
      else{
        if(toolActual == tools.ERASER){
            if(((x1>=pmin.x && x1<=pmax.x) || this.ms == 0) && y1>=pmin.y && y1<=pmax.y){
                this.del = true;
                r = true;
            }
        }
      }
    }
    return r;
  }

  check2(x,y,d){
    var pt = this.proj(x,y);
    var x1 = pt.x;
    var y1 = pt.y;

    var dist=sqrt(sq(x1-x) + sq(y1-y));
    if(dist < d){
      if(toolActual == tools.GATE){
        var pmin = ftToPixels(this.xMin, this.yMin);
        var pmax = ftToPixels(this.xMax, this.yMax);
        /*
        if(((pt.x>=this.xMin && pt.x<=this.xMax) || this.ms == 0) &&
           pt.y>=this.yMin && pt.y<=this.yMax){
        */
        if(((x1>=pmin.x && x1<=pmax.x) || this.ms == 0) &&
           y1>=pmin.y && y1<=pmax.y){

          var p1 = ftToPixels(this.node1.x, this.node1.y);
          var p2 = ftToPixels(this.node2.x, this.node2.y);
          /*
          this.addDim(dimension(this.node1.x,this.node1.y,pt.x,pt.y));
          this.addDim(dimension(pt.x,pt.y,this.node2.x,this.node2.y));
          */
          var w = wDoor * gridSpacing;
          var x2 = x1 + w / (sqrt(1+sq(this.m)));
          var y2 = y1 + this.m * w / (sqrt(1+sq(this.m)));

          ellipse(x1, y1, 5, 5);
          this.clearDims();
          ellipse(x2, y2, 5, 5);
          //ellipse((pt.x+x2)/2, (pt.y+y2)/2, w, w, w);

          // Puerta
          var dx = (x2-pt.x)/w;
          var dy = (y2-pt.y)/w;
          var x3 = x1+w*dx*sqrt(2)/2-w*dy*sqrt(2)/2;
          var y3 = y1+w*dy*sqrt(2)/2+w*dx*sqrt(2)/2;
          line(x1,y1,x3,y3);

          if(p1.x <= p2.x){
            if(x2 >= p2.x){
              this.addDim(dimension(p1.x,p1.y,x1,y1));
              this.addDim(dimension(x1,y1,p2.x,p2.y));
            }
            else{
              this.addDim(dimension(p1.x,p1.y,x1,y1));
              this.addDim(dimension(x1,y1,x2,y2));
              this.addDim(dimension(x2,y2,p2.x,p2.y));
            }
          }
          else{
            if(pt.x <= p2.x){
              this.addDim(dimension(p2.x,p2.y,x1,y1));
              this.addDim(dimension(x1,y1,p1.x,p1.y));
            }
            else{
              this.addDim(dimension(p2.x,p2.y,x1,y1));
              this.addDim(dimension(x1,y1,x2,y2));
              this.addDim(dimension(x2,y2,p1.x,p1.y));
            }
          }
        }
      }
      else{
        if(toolActual == tools.ERASER){
          this.del = true;
        }
      }
    }
    return (dist < d);
  }

  paint(){
    push();

    stroke(0);
    switch(this.type){
      case tools.FENCE:
        strokeWeight(1);
        break;
      case tools.WALL:
        strokeWeight(5);
        break;
      case tools.FENCE_2:
        strokeWeight(2);
        stroke(0,0,200);
        drawingContext.setLineDash([5,10]);
        break;
      case tools.GATE:
        strokeWeight(1);
        break;
    }
    if(this.del){
      stroke(255, 0, 0);
    }

    if(this.type == tools.GATE || this.type == tools.DOUBLE) {
        var p1 = ftToPixels(this.node1.x, this.node1.y);
        var p3 = ftToPixels(this.x3, this.y3);

        line(p1.x, p1.y, p3.x, p3.y);
        if(this.type == tools.DOUBLE){
            var p2 = ftToPixels(this.node2.x, this.node2.y);
            var p4 = ftToPixels(this.x4, this.y4);

            line(p2.x, p2.y, p4.x, p4.y);
        }
    }
    else
    {
        var p1 = ftToPixels(this.node1.x, this.node1.y);
        var p2 = ftToPixels(this.node2.x, this.node2.y);
        //line(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
        line(p1.x, p1.y, p2.x, p2.y);
        //dimension(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
    }
    drawingContext.setLineDash([]);
    stroke(0);
    for(var i=0;i<this.dims.length;i++){
        this.dims[i].paint();
    }
    pop();
  }

  countId(id){
    var c = 0;
    if(this.node1.id == id){
      c++;
    }
    if(this.node2.id == id){
      c++;
    }
    return c;
  }

  print(){
    console.log(this.node1.id, this.node2.id);
  }
}
