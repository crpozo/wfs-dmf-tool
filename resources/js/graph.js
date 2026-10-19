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
  
  removeEdge(vert1, vert2){
    vert1.removeEdge(vert2);
    vert2.removeEdge(vert1);
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
  
  checkEdges(x,y,d){
    for(var i=0;i<this.vertices.length;i++){
      let vert = this.vertices[i];
      for(var j=0;j<vert.edges.length;j++){
        let edge = vert.edges[j];
        if(edge.type == 1){
          if(!edge.check(x,y,d)){
            if(edge.dims.length == 0 || edge.dims.length >= 2){
              edge.clearDims();
              edge.setDim();
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
}