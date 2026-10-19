class Edge{

  constructor(node1, node2, type, id, ft) {
      this.node1 = node1;
      this.node2 = node2;
      this.type = type;
      this.length = sqrt(sq(node1.x - node2.x) + sq(node1.y - node2.y));
      this.dims = [];
      this.del = false;
      this.linked = null;
      if (ft) {
          this.ft = ft
      }
      else{
        this.ft = null;
      }
        //console.log(this.node1.id, this.node2.id);
        this.leftSide = null;
        this.rightSide = null;

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
            this.doorType = doorType;
        }
        if(type == tools.DOUBLE){
            // <<< 06/09/25 error en carga de wfs caso 186, w undefined
            var w = ft
            // 06/09/25 >>>
            var dx = ((this.node2.x+this.node1.x)/2 - this.node1.x) / (w/2);
            var dy = ((this.node2.y+this.node1.y)/2 - this.node1.y) / (w/2);

            this.x3 = this.node1.x + (w/2) * dx * sqrt(2) / 2 - (w/2) * dy * sqrt(2) / 2;
            this.y3 = this.node1.y + (w/2) * dy * sqrt(2) / 2 + (w/2) * dx * sqrt(2) / 2;

            var dw = this.length * (sqrt(2) - 1) / sqrt(2);
            this.x4 = this.x3 + dw / (sqrt(1 + sq(this.m)));
            this.y4 = this.y3 + this.m * dw / (sqrt(1 + sq(this.m)));
            this.doorType = doorType;
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

        if(type != types.WALL) {
            if(ft){
                this.setDim(ft, sep);
                if(id) {
                    this.id = id;
                }
            }
            else{
                if (id) {
                    this.id = id;
                    this.setDim("d" + id, sep);
                } else {
                    this.setDim("d", sep);
                }
                this.addInput();
            }
        }
        this.fenceMaterial = this.type-2;
    }

  addInput(){
    var item = inputRow.replace("%%%ID%%%", "input_" + this.id);
    item = item.replace("%%%ROW_ID%%%", "row_" + this.id);
    item = item.replace("%%%D%%%", "d" + this.id);
    item = item.replace("%%%NAME%%%", "d" + this.id);
    item = item.replace("%%%ID_TXT%%%", "txt_" + this.id);
    $('#dynamic_field').append(item);
    $('#submitDims').css('display','block');
    $('#btnEstimate').css('display','none');
    $('#formEstimate').css('display','none');
    $('#btnQuote').css('display','none');
  }


  setDoorType(doorType){
      this.doorType = doorType;
  }

  setFenceMaterialForDoor(type){
      this.fenceMaterial = type-2;
  }

  setFenceMaterialForDoorLoad(type){
      this.fenceMaterial = type;
  }

  over(){
    var odim = null;
    if(toolActualGroup[1] != tools.GATE && toolActualGroup[1] != tools.DOUBLE) {
        for (var i = 0; i < this.dims.length; i++) {
            odim = this.dims[i].over();
            if (odim != null) {
                break;
            }
        }
    }
    return odim;
  }

  link(edge2){
      /*
      if(this.linked == null) {
          this.linked = edge2;
          var dim1 = this.getDim();
          var dim2 = edge2.getDim();
          if(dim1 != null && dim2 != null){
              dim1.link(dim2);
          }
          edge2.link(this);
      }
       */
  }

  unlink(edge2){
      /*
      if(this.linked != null){
          this.linked = null;
          edge2.unlink(this);
      }
      */
  }

  reDim(){
      this.clearDims();
      if(this.ft){
          this.setDim(this.ft, sep);
      }
      else {
          this.setDim("d" + this.id, sep);
      }
  }

  getNodeAsoc(){
      var nodeAsoc = null;
      for(var i=0;i<this.node1.edges.length;i++){
          var edge = this.node1.edges[i];
          if(edge == this){
              nodeAsoc = this.node1;
              break;
          }
      }
      if(nodeAsoc == null){
          nodeAsoc = this.node2;
      }
      return nodeAsoc;
  }


  // Para "rehacer" cercas al borrar puertas, el que queda es el edge1 (debería ser cerca)
  merge(edge2){
      // Si el nodo que se elimina es el que tiene asociado al edge, es necesario re-asociarlo a alguno de los nodos
      var nodeAsoc = this.getNodeAsoc();

      if(this.node1 == edge2.node1){
          if(nodeAsoc == this.node1){
              edge2.node2.edges.push(this);
          }
          this.node1 = edge2.node2;
      }
      else{
          if(this.node2 == edge2.node2){
              if(nodeAsoc == this.node2){
                  edge2.node1.edges.push(this);
              }
              this.node2 = edge2.node1;
          }
          else{
              if(this.node1 == edge2.node2){
                  if(nodeAsoc == this.node1){
                      edge2.node1.edges.push(this);
                  }
                  this.node1 = edge2.node1;
              }
              else{
                  if(this.node2 == edge2.node1){
                      if(nodeAsoc == this.node2){
                          edge2.node2.edges.push(this);
                      }
                      this.node2 = edge2.node2;
                  }
              }
          }
      }
      if(this.node2.x < this.node1.x){
          this.xMin = this.node2.x;
          this.xMax = this.node1.x;
      }
      else{
          this.xMin = this.node1.x;
          this.xMax = this.node2.x;
      }
      this.yMin = this.node1.y;
      if(this.node2.y < this.node1.y){
          this.yMin = this.node2.y;
          this.yMax = this.node1.y;
      }
      else{
          this.yMin = this.node1.y;
          this.yMax = this.node2.y;
      }

      if(this.ft && edge2.ft){
          this.ft = this.ft + edge2.ft;
      }
      this.length = this.length + edge2.length;
      this.reDim();
  }

  // side: 0 left, 1 right
  setSide(edge, side){
      if(side == 0){
          this.leftSide = edge;
      }
      else{
          this.rightSide = edge;
      }
  }

  getDim(){
    if(this.dims.length > 0){
        return this.dims[0];
    }
    else{
        return null;
    }
  }

  setDim(texto, gap){
    var p1 = ftToPixels(this.node1.x,this.node1.y);
    var p2 = ftToPixels(this.node2.x,this.node2.y);

    this.ft = parseInt(texto);
    //var dim = dimension(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
    var dim = dimension(p1.x,p1.y,p2.x,p2.y, texto, gap);
    this.addDim(dim);
    if(this.linked != null){
        dim.link(this.linked.getDim());
    }
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
    push();

    var r = false;
    var pt = this.proj(x,y);
    var x1 = pt.x;
    var y1 = pt.y;

    var dist=sqrt(sq(x1-x) + sq(y1-y));
    if(dist < d){
      var pmin = ftToPixels(this.xMin, this.yMin);
      var pmax = ftToPixels(this.xMax, this.yMax);

      this.ms = round(this.ms, 5);
      //if(this.type != types.WALL && (toolActual == tools.GATE || toolActual == tools.DOUBLE)){
      //if(this.type != types.WALL && (toolActualGroup[1] == tools.GATE || toolActualGroup[1] == tools.DOUBLE)){
      if((this.type == types.FENCE || this.type == types.FENCE_2 || this.type == types.FENCE_3) && (toolActualGroup[1] == tools.GATE || toolActualGroup[1] == tools.DOUBLE)){
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
          // Debe hacerse proporcional al largo del edge
          //var w = wDoor * gridSpacing;
          var edgeLength = sqrt(sq(this.xMax-this.xMin) + sq(this.yMax-this.yMin));
          edgeLength = this.length;
          var w = this.length / this.ft * wDoor * gridSpacing;
          //console.log("W: ", w);
          var x2 = x1 + w / (sqrt(1 + sq(this.m)));
          var y2 = y1 + this.m * w / (sqrt(1 + sq(this.m)));

          // Door width = section length
          if(w == this.length){
              x1 = p1.x;
              x2 = p2.x;
              y1 = p1.y;
              y2 = p2.y;
          }

          graph.check(x1,y1,snapV);
          graph.check(x2,y2,snapV);

          if(this.ms == 0){
              x2 = x1;
          }

          if ((x2 <= pmax.x && this.ms != 0) || (this.ms == 0 && y2 >= pmin.y && y2 <= pmax.y && y1 >= pmin.y && y1 <= pmax.y)) {
              r = true;
              ellipse(x1, y1, 5, 5);
              this.clearDims();
              ellipse(x2, y2, 5, 5);
              // Puerta
              //if(toolActual == tools.GATE) {
              if(toolActualGroup[1] == tools.GATE) {
                  switch(doorType) {
                      case doorTypes.SWING_GATE:
                          var dx = (x2 - x1) / w;
                          var dy = (y2 - y1) / w;
                          var x3 = x1 + w * dx * sqrt(2) / 2 - w * dy * sqrt(2) / 2;
                          var y3 = y1 + w * dy * sqrt(2) / 2 + w * dx * sqrt(2) / 2;
                          line(x1, y1, x3, y3);
                          break;
                      case doorTypes.ROLLING_GATE:
                          /*
                          line(x1+2, y1+6, x2-2, y1+6);
                          line(x2-5, y1+9, x2-5, y1+3);
                          strokeWeight(3);
                          line(x2-7, y1+3, x2-3, y1+3);
                          line(x2-7, y1+9, x2-3, y1+9);
                           */
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.rollingGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                      case doorTypes.SLIDING_GATE:
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.slidingGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                      case doorTypes.CANTILEVER_GATE:
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.cantileverGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                  }
              }
              else{ //DOUBLE
                  switch(doorType) {
                      case doorTypes.SWING_GATE:
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
                          break;
                      case doorTypes.ROLLING_GATE:
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.rollingDoubleGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                      case doorTypes.SLIDING_GATE:
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.slidingDoubleGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                      case doorTypes.CANTILEVER_GATE:
                          push();
                          translate(x1,y1);
                          var alpha = HALF_PI;
                          if(x1!=x2){
                              alpha = atan((y2-y1)/(x2-x1));
                          }
                          rotate(alpha);
                          this.cantileverDoubleGate(sqrt(sq(x2-x1)+sq(y2-y1)));
                          pop();
                          break;
                  }
              }

              var sp1 = round(wDoor / sqrt(sq(x1-x2) + sq(y1-y2)) * sqrt(sq(x1-p1.x) + sq(y1-p1.y)), 0);
              var sp2 = this.ft - sp1 - wDoor;

              if(sp1 > 0) {
                  this.addDim(dimension(p1.x, p1.y, x1, y1, sp1, sep));
              }
              this.addDim(dimension(x1, y1, x2, y2, wDoor, sep));
              if(sp2 > 0) {
                  this.addDim(dimension(x2, y2, p2.x, p2.y, sp2, sep));
              }
              // dim total
              var pi = ftToPixels(this.node1.x, this.node1.y);
              var pf = ftToPixels(this.node2.x, this.node2.y);
              this.addDim(dimension(pi.x, pi.y, pf.x, pf.y, this.ft, sep2));
          }
        }
      }
      else{
        //if(toolActual == tools.ERASER){
        if(toolActualGroup[1] == tools.ERASER){
            if(((x1>=pmin.x && x1<=pmax.x) || this.ms == 0) && y1>=pmin.y && y1<=pmax.y){
                this.del = true;
                r = true;
            }
        }
      }
    }

    pop();
    return r;
  }

  check2(x,y,d){
    var pt = this.proj(x,y);
    var x1 = pt.x;
    var y1 = pt.y;

    var dist=sqrt(sq(x1-x) + sq(y1-y));
    if(dist < d){
      //if(toolActual == tools.GATE){
      if(toolActualGroup[1] == tools.GATE){
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
        //if(toolActual == tools.ERASER){
        if(toolActualGroup[1] == tools.ERASER){
          this.del = true;
        }
      }
    }
    return (dist < d);
  }

  slidingGate(xDoor){

    translate(0,5);
    var wFrame = 4;
    var lSupport = 4;
    var wSupport = 2;

    strokeWeight(1);
    fill(255,255,0);
    rect(0,0,xDoor,wFrame);
    translate(0,wFrame);
    line(0,lSupport,xDoor,lSupport);
    rect(0,0,wSupport,lSupport);
    translate(xDoor/2 - wSupport/2,0);
    rect(0,0,wSupport,lSupport);
    translate(xDoor/2 - wSupport/2,0);
    rect(0,0,wSupport,lSupport);
  }

    slidingDoubleGate(xDoor){

        translate(0,5);
        var wFrame = 4;
        var lSupport = 4;
        var wSupport = 2;

        strokeWeight(1);
        fill(255,255,0);
        rect(0,0,xDoor/2-3,wFrame);
        translate(0,wFrame);
        line(0,lSupport,xDoor/2-3,lSupport);
        rect(0,0,wSupport,lSupport);
        translate(xDoor/4 - wSupport/2 -1,0);
        rect(0,0,wSupport,lSupport);
        translate(xDoor/4 - wSupport/2 -1,0);
        rect(0,0,wSupport,lSupport);

        translate(3,-wFrame);
        rect(0,0,xDoor/2,wFrame);
        translate(0,wFrame);
        line(0,lSupport,xDoor/2,lSupport);
        rect(0,0,wSupport,lSupport);
        translate(xDoor/4 - wSupport/2 -1,0);
        rect(0,0,wSupport,lSupport);
        translate(xDoor/4 - wSupport/2 -1,0);
        rect(0,0,wSupport,lSupport);
    }


  rollingGate(xDoor){
      translate(0,8);
      var wTire = 8;
      var lAxis = 8;
      var posTire = 0.85;
      //var pDoor = ftToPixels(wDoor,0);
      //var xDoor = pDoor.x;
      strokeWeight(2);
      line(0,0,xDoor,0);
      stroke(0,0,255);
      line(xDoor * posTire, lAxis/2, xDoor*posTire, -lAxis/2);
      strokeWeight(3);
      line(xDoor*posTire-wTire/2, lAxis/2, xDoor*posTire+wTire/2, lAxis/2);
      line(xDoor*posTire-wTire/2, -lAxis/2, xDoor*posTire+wTire/2, -lAxis/2);
  }

    rollingDoubleGate(xDoor){
        translate(0,8);
        var wTire = 8;
        var lAxis = 8;
        var posTire = 0.85;
        //var pDoor = ftToPixels(wDoor,0);
        //var xDoor = pDoor.x;
        strokeWeight(2);
        line(0,0,xDoor/2-3,0);
        line(xDoor/2+3,0,xDoor,0);
        stroke(0,0,255);
        line(xDoor/2 * posTire, lAxis/2, xDoor/2*posTire, -lAxis/2);
        line(xDoor - (xDoor/2 * posTire), lAxis/2, xDoor - (xDoor/2*posTire), -lAxis/2);

        strokeWeight(3);
        line(xDoor/2*posTire-wTire/2, lAxis/2, xDoor/2*posTire+wTire/2, lAxis/2);
        line(xDoor/2*posTire-wTire/2, -lAxis/2, xDoor/2*posTire+wTire/2, -lAxis/2);

        line(xDoor - (xDoor/2*posTire-wTire/2), lAxis/2, xDoor - (xDoor/2*posTire+wTire/2), lAxis/2);
        line(xDoor - (xDoor/2*posTire-wTire/2), -lAxis/2, xDoor - (xDoor/2*posTire+wTire/2), -lAxis/2);
    }

  cantileverGate(xDoor){
      translate(0,5);
      var cantilever = 0.5;
      var wRoll = 6;
      fill(255,0,0);
      ellipse(-xDoor*cantilever,wRoll,wRoll, wRoll);
      ellipse(0,wRoll,wRoll, wRoll);
      strokeWeight(3);
      line(-xDoor*cantilever,0, xDoor, 0);
  }

    cantileverDoubleGate(xDoor){
        translate(0,5);
        var cantilever = 0.25;
        var wRoll = 6;
        fill(255,0,0);
        ellipse(-xDoor*cantilever,wRoll,wRoll, wRoll);
        ellipse(0,wRoll,wRoll, wRoll);
        ellipse(xDoor,wRoll,wRoll, wRoll);
        ellipse(xDoor*(1+cantilever),wRoll,wRoll, wRoll);
        strokeWeight(3);
        line(-xDoor*cantilever,0, xDoor/2-3, 0);
        line(xDoor/2+3,0, xDoor*(1+cantilever), 0);
    }

  paint(){
    push();

    stroke(0);
    switch(this.type){
      case tools.FENCE:
        strokeWeight(2);
        break;
      case tools.WALL:
        strokeWeight(5);
        stroke(0,200,20);
        break;
      case tools.FENCE_2:
        strokeWeight(2);
        stroke(0,0,200);
        drawingContext.setLineDash([5,10]);
        break;
      case tools.FENCE_3:
        strokeWeight(2);
        stroke(200,0, 0);
        drawingContext.setLineDash([3,3,3,3]);
        break;
      case tools.GATE:
        strokeWeight(2);
        break;
    }
    if(this.del){
      stroke(255, 0, 0);
    }

    if(this.type == tools.GATE || this.type == tools.DOUBLE) {
        var p1 = ftToPixels(this.node1.x, this.node1.y);
        var p2 = ftToPixels(this.node2.x, this.node2.y);
        var p3 = ftToPixels(this.x3, this.y3);

        if(this.type == tools.DOUBLE){
            switch(this.doorType){
                case doorTypes.SWING_GATE:
                    var p4 = ftToPixels(this.x4, this.y4);
                    line(p1.x, p1.y, p3.x, p3.y);
                    line(p2.x, p2.y, p4.x, p4.y);
                    break;
                case doorTypes.ROLLING_GATE:
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.rollingDoubleGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();
                    break;
                case doorTypes.SLIDING_GATE:
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.slidingDoubleGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();
                    break;
                case doorTypes.CANTILEVER_GATE:
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.cantileverDoubleGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();
                    break;
            }
        }
        else {
            switch (this.doorType) {
                case doorTypes.SWING_GATE:
                    line(p1.x, p1.y, p3.x, p3.y);
                    break;
                case doorTypes.ROLLING_GATE:
                    /*
                    line(p1.x+2, p1.y+6, p3.x-2, p1.y+6);
                    line(p3.x-5, p1.y+9, p3.x-5, p1.y+3);
                    strokeWeight(3);
                    line(p3.x-7, p1.y+3, p3.x-3, p1.y+3);
                    line(p3.x-7, p1.y+9, p3.x-3, p1.y+9);
                     */
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.rollingGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();

                    break;
                case doorTypes.SLIDING_GATE:
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.slidingGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();
                    break;
                case doorTypes.CANTILEVER_GATE:
                    push();

                    translate(p1.x, p1.y);
                    var alpha = HALF_PI;
                    if (p1.x != p2.x) {
                        alpha = atan((p2.y - p1.y) / (p2.x - p1.x));
                    }
                    rotate(alpha);
                    this.cantileverGate(sqrt(sq(p2.x - p1.x) + sq(p2.y - p1.y)));

                    pop();
                    break;
            }
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
      if(this.type == tools.GATE || this.type == tools.DOUBLE){
          console.log(this.node1.id + "-" + this.node2.id + ": " + this.type + "/" + this.doorType + " : " + this.getDim().texto);
      }
      else {
          console.log(this.node1.id + "-" + this.node2.id + ": " + this.type + " : " + this.getDim().texto);
      }
  }

    getData(){
        var edge;
        if(this.type == tools.GATE || this.type == tools.DOUBLE){
            edge = {node1:this.node1.id, node2:this.node2.id, x1:this.node1.x, y1:this.node1.y, x2:this.node2.x, y2:this.node2.y, door:1, type:this.type, material:this.fenceMaterial, doorType:this.doorType, length:this.getDim().texto};
        }
        else {
            if(this.type == tools.WALL){
                edge = {node1:this.node1.id, node2:this.node2.id, x1:this.node1.x, y1:this.node1.y, x2:this.node2.x, y2:this.node2.y, door:0, type:this.type, material:this.fenceMaterial};
            }
            else{
                edge = {node1:this.node1.id, node2:this.node2.id, x1:this.node1.x, y1:this.node1.y, x2:this.node2.x, y2:this.node2.y, door:0, type:this.type, material:this.fenceMaterial, length:this.getDim().texto};
            }
        }
        return edge;
    }

}
