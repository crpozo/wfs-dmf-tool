class Vert{

  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.edges = [];
    this.r = vSize;
  }

  addEdge(vert, type){
    let edge = new Edge(this, vert, type);
    this.edges.push(edge);
    return edge;
  }

  removeEdge(vert){
    this.edges = this.edges.filter((item) => item.node2 != vert);
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
    if(radius == null){
      radius = this.r;
    }
    this.edges.forEach(paintEdge);

    function paintEdge(edge){
      edge.paint();
    }
    //ellipse(this.x, this.y, radius);
    var p = ftToPixels(this.x, this.y);
    ellipse(p.x, p.y, radius);
  }

  print(){
    console.log(this.id + "_(" + this.x + "," + this.y + ")");
    for(var i=0; i<this.edges.length; i++){
      console.log("->" + this.edges[i].node2.id);
    }
  }

}
