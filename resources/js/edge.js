class Edge{
  
  constructor(node1, node2, type) {
    this.node1 = node1;
    this.node2 = node2;
    this.type = type;
    this.length = sqrt(sq(node1.x-node2.x)+sq(node1.y-node2.y));
    this.dims = [];
    
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
    this.dims.push(dim);
  }
  
  check(x,y,d){
    var pt = this.proj(x,y);
    
    var dist=sqrt(sq(pt.x-x) + sq(pt.y-y));
    
    if(dist < d){
      var pmin = ftToPixels(this.xMin, this.yMin);
      var pmax = ftToPixels(this.xMax, this.yMax);
      /*
      if(((pt.x>=this.xMin && pt.x<=this.xMax) || this.ms == 0) && 
         pt.y>=this.yMin && pt.y<=this.yMax){
      */
      if(((pt.x>=pmin.x && pt.x<=pmax.x) || this.ms == 0) && 
         pt.y>=pmin.y && pt.y<=pmax.y){
        
        var p1 = ftToPixels(this.node1.x, this.node1.y);
        var p2 = ftToPixels(this.node2.x, this.node2.y);
 /*     this.addDim(dimension(this.node1.x,this.node1.y,pt.x,pt.y));
        this.addDim(dimension(pt.x,pt.y,this.node2.x,this.node2.y));
        */
        var w = wDoor * gridSpacing;
        var x2 = pt.x + w / (sqrt(1+sq(this.m)));
        var y2 = pt.y + this.m * w / (sqrt(1+sq(this.m)));
        
        
        ellipse(pt.x, pt.y, 5, 5);
        this.clearDims();
        ellipse(x2, y2, 5, 5);
        //ellipse((pt.x+x2)/2, (pt.y+y2)/2, w, w, w);

        // Puerta
        var dx = (x2-pt.x)/w;
        var dy = (y2-pt.y)/w;
        var x3 = pt.x+w*dx*sqrt(2)/2-w*dy*sqrt(2)/2;
        var y3 = pt.y+w*dy*sqrt(2)/2+w*dx*sqrt(2)/2;
        line(pt.x,pt.y,x3,y3);
        
        if(p1.x <= p2.x){
          if(x2 >= p2.x){
            this.addDim(dimension(p1.x,p1.y,pt.x,pt.y));
            this.addDim(dimension(pt.x,pt.y,p2.x,p2.y));
          }
          else{
            this.addDim(dimension(p1.x,p1.y,pt.x,pt.y));
            this.addDim(dimension(pt.x,pt.y,x2,y2));         
            this.addDim(dimension(x2,y2,p2.x,p2.y));
          }
        }
        else{
          if(pt.x <= p2.x){
            this.addDim(dimension(p2.x,p2.y,pt.x,pt.y));
            this.addDim(dimension(pt.x,pt.y,p1.x,p1.y));
          }
          else{
            this.addDim(dimension(p2.x,p2.y,pt.x,pt.y));
            this.addDim(dimension(pt.x,pt.y,x2,y2));         
            this.addDim(dimension(x2,y2,p1.x,p1.y));
          }
        }
      }
    }
    return (dist < d);
  }
  
  paint(){
    switch(this.type){
      case 1:
        strokeWeight(1);
        break;
      case 2:
        strokeWeight(5);
        break;
    }
    var p1 = ftToPixels(this.node1.x, this.node1.y);
    var p2 = ftToPixels(this.node2.x, this.node2.y);
      //line(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
    line(p1.x,p1.y,p2.x,p2.y);
    //dimension(this.node1.x,this.node1.y,this.node2.x,this.node2.y);
    for(var i=0;i<this.dims.length;i++){
        this.dims[i].paint();
    }
    /*
    let xd = 5;
    let yd = 20;
    
    if(this.vertical){
      if(this.node2.y > this.node1.y){
        textAlign(LEFT, CENTER);        
      }
      else{
        textAlign(RIGHT, CENTER);
        xd = -xd;
      }
    }
    else{
      if(this.node2.x > this.node1.x){
        textAlign(CENTER, BOTTOM);
      }
      else{
        textAlign(CENTER, TOP);
        yd = -yd;
      }
    }
    text(this.length.toFixed(0), (this.node1.x+this.node2.x)/2 + xd, (this.node1.y+this.node2.y)/2) + yd;
    */
  }
  
}