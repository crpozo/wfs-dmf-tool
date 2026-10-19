class Vert{

  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.edges = [];
    this.r = vSize;
  }

  over(){
    var oedge = null;
    for(var i=0;i<this.edges.length;i++){
        oedge = this.edges[i].over();
        if(oedge != null){
            break;
        }
    }
    return oedge;
  }

  countEdges(){
    return this.edges.length;
  }

  countEdgesId(id){
    var c = 0;
    for(var i=0;i<this.edges.length;i++){
      var edge = this.edges[i];
      //console.log("EDGE",edge.nodo1.id, edge.nodo2.id);
      c = c + edge.countId(id);
    }
    return c;
  }

  addEdgeId(vert, type, id){
    let edge = new Edge(this, vert, type, id);
    this.edges.push(edge);
    return edge;
  }

  addEdgeFt(vert, type, id, ft){
      let edge = new Edge(this, vert, type, id, ft);
      this.edges.push(edge);
      return edge;
  }

  addEdge(vert, type){
    let edge = new Edge(this, vert, type);
    this.edges.push(edge);
    return edge;
  }

  removeEdge(vert){
    var id = 0;
    var edge = this.edges.filter((item) => item.node2 == vert);
    if(edge.length == 1) {
        id = edge[0].id;
        $("#row_" + edge[0].id).remove();
    }
    this.edges = this.edges.filter((item) => item.node2 != vert);
    return id;
  }

  getEdgeSameLine(edge){
      var sameEdge = null;
      for(var i=0;i<this.edges.length;i++){
          var edgeActual = this.edges[i];
          if(edge != edgeActual && edge.m == edgeActual.m){
              sameEdge = edgeActual;
              break;
          }
      }
      return sameEdge;
  }

  distance(x,y){
    return sqrt(sq(this.x-x) + sq(this.y-y));
  }

  // Operacion a nivel de pixels
  check(x,y,d){
    var q = ftToPixels(this.x,this.y);
    var dr = sqrt(sq(q.x-x) + sq(q.y-y));
    //console.log(q.x,q.y);
    //console.log("p",p.x,p.y);
    return(dr < d);
    //return (this.distance(x,y) < d);
  }

  paint(radius){
    push();

    if(radius == null){
      radius = this.r;
    }
    this.edges.forEach(paintEdge);

    function paintEdge(edge){
      edge.paint();
    }
    //ellipse(this.x, this.y, radius);
    var p = ftToPixels(this.x, this.y);

    noFill();
    ellipse(p.x, p.y, radius);

    pop();
  }

  print(){
    //console.log(this.id + "_(" + this.x + "," + this.y + ")");
    for(var i=0; i<this.edges.length; i++){
      //console.log("->" + this.edges[i].node2.id + ":" + this.edges[i].type + " - " + this.edges[i].getDim().texto);
        this.edges[i].print();
    }
  }

  getData(){
      var data = [];
      for(var i=0; i<this.edges.length; i++){
          if(this.edges[i].node1.id != this.edges[i].node2.id) {
              data.push(this.edges[i].getData());
          }
      }
      return data;
  }


}
