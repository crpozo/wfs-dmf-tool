class Graph{

  constructor() {
    this.vertices = [];
    this.count = 0;
  }

  clear(){
    this.vertices = [];
    this.count = 0;
  }

  addVertex(x,y){
    this.count++;
    //let vert= new Vert(this.count, x, y);
    var p = pixelsToFt(x, y);
    let vert= new Vert(this.count, p.x, p.y);
    this.vertices.push(vert);
    return vert;
  }

  removeVertex(vert){
    this.vertices = this.vertices.filter((item) => item != vert);
  }

  addEdge(vert1, vert2, type){
    return vert1.addEdge(vert2, type);
  }

  countEdgesVert(id){
    var c = 0;
    for(var i=0;i<this.vertices.length;i++){
      var v = this.vertices[i];
      c = c + v.countEdgesId(id);
    }
    return c;
  }

  removeEdge(vert1, vert2, removeVertex=true){

    vert1.removeEdge(vert2);
    vert2.removeEdge(vert1);
    /*
    var c = vert1.countEdges();
    for(var i=0;i<this.vertices.length;i++){
      var v = this.vertices[i];
      if(v != vert1){
        for(var j=0;j<v.edges.length;j++){
          var e = v.edges[j];
          if(e.node1 == vert1 || e.node2 == vert1){
            c++;
          }
        }
      }
    }
    if(c==0){
      this.removeVertex(vert1);
    }
    c = 0;
    for(var i=0;i<this.vertices.length;i++){
      var v = this.vertices[i];
      if(v != vert2){
        for(var j=0;j<v.edges.length;j++){
          var e = v.edges[j];
          if(e.node1 == vert2 || e.node2 == vert2){
            c++;
          }
        }
      }
    }
    if(c==0){
      this.removeVertex(vert2);
    }
    console.log(vert1.countEdges(), vert2.countEdges());
    vert1.print();
    vert2.print();
    if(vert1.countEdges() == 0){
      this.removeVertex(vert1);
    }
    if(vert2.countEdges() == 0){
      this.removeVertex(vert2);
    }
    */
    if(removeVertex) {
        if (this.countEdgesVert(vert1.id) == 0) {
            this.removeVertex(vert1);
        }
        if (this.countEdgesVert(vert2.id) == 0) {
            this.removeVertex(vert2);
        }
    }
  }

  check(x,y,d){
    let resp = null;
    for(var i=0;i<this.vertices.length;i++){
      let vertx = this.vertices[i];
      if(actual == null || (vertx.id != actual.id)){
      //if(actual != null && (vertx.id != actual.id) ){
        if(vertx.check(x,y,d)){
          vertx.paint(20);
          resp = vertx;
          break;
        }
      }
    }
    return resp;
  }

    addDoor(edge, x,y,type, width){
        var pt = edge.proj(x,y);
        var x1 = pt.x;
        var y1 = pt.y;

        var p1;
        var p2;
        var n1 = edge.node1;
        var n2 = edge.node2;
        if(edge.ms == 0) {
            if (edge.node1.y < edge.node2.y) {
                p1 = ftToPixels(edge.node1.x, edge.node1.y);
                p2 = ftToPixels(edge.node2.x, edge.node2.y);
            } else {
                p2 = ftToPixels(edge.node1.x, edge.node1.y);
                p1 = ftToPixels(edge.node2.x, edge.node2.y);
                n1 = edge.node2;
                n2 = edge.node1;
            }
        }
        else {
            if (edge.node1.x < edge.node2.x) {
                p1 = ftToPixels(edge.node1.x, edge.node1.y);
                p2 = ftToPixels(edge.node2.x, edge.node2.y);
            } else {
                p2 = ftToPixels(edge.node1.x, edge.node1.y);
                p1 = ftToPixels(edge.node2.x, edge.node2.y);
                n1 = edge.node2;
                n2 = edge.node1;
            }
        }

        var w = width * gridSpacing;
        var x2 = x1 + w / (sqrt(1+sq(edge.m)));
        var y2 = y1 + edge.m * w / (sqrt(1+sq(edge.m)));

        var v1 = this.addVertex(x1, y1);
        var v2 = this.addVertex(x2, y2);
        var typeF = edge.type;

        this.addEdge(n1,v1,typeF);
        this.addEdge(v1,v2,type);
        this.addEdge(v2,n2,typeF);
        this.removeEdge(edge.node1, edge.node2, false);

    }

    checkEdges(x,y,d){
        for(var i=0;i<this.vertices.length;i++){
          let vert = this.vertices[i];
          for(var j=0;j<vert.edges.length;j++){
            let edge = vert.edges[j];
            if(edge.type == tools.FENCE || edge.type == tools.FENCE_2){
              if(!edge.check(x,y,d)){
                edge.setDel(false);
                if(edge.dims.length == 0 || edge.dims.length >= 2){
                  edge.clearDims();
                  edge.setDim();
                }
              }
              else{
                if (mouseIsPressed){
                  if(toolActual == tools.ERASER){
                    this.removeEdge(edge.node1, edge.node2);
                  }
                  if(toolActual == tools.GATE || toolActual == tools.DOUBLE){
                    this.addDoor(edge,x,y,toolActual,wDoor);
                  }
                  mouseIsPressed = false;
                }
              }
            }
          }
        }
    }

    direction(){
        // 1 clockwise 2 counter-clockwise
        this.vertices.forEach();
    }

    paint(){
        this.vertices.forEach(paintVertex);

        function paintVertex(vert){
          vert.paint();
        }
    }

    toJson(){
        this.vertices.forEach(vertexToJson);

        function vertexToJson(vert){
            vert.paint();
        }
    }
}
