class Pt{
  constructor(x,y) {
    this.x = x;
    this.y = y;
    this.next = [];
  }

  show(){        
    for(let i=0;i<this.next.length;i++){
      let n = this.next[i];
      line(this.x,this.y,n.x,n.y);
      
      let d = sqrt(sq(this.x-n.x) + sq(this.y-n.y));
      d = d.toFixed(0);
      
      let dx = 0;
      let dy = 0;
      if(n.x > this.x){
        textAlign(CENTER, BOTTOM);
        dy = -2;
      }
      else{
        if(n.y > this.y){
          textAlign(LEFT, CENTER);
          dx = 5;
        }
        else{
          if(this.y > n.y){
            textAlign(RIGHT, CENTER);
            dx = -5;
          } 
          else{
            textAlign(CENTER, TOP);
            dy = 2;
          }
        }
        
      }
      text(d, this.x+(n.x-this.x)/2 + dx, this.y+(n.y-this.y)/2 + dy);      
      n.show();
    }
    ellipse(this.x, this.y, 10);
  }
  
  addNext(pt){
    this.next[this.next.length] = pt
  }
  
  distance(x,y){
    return sqrt(sq(this.x-x) + sq(this.y-y));
  }
  
  check(x,y,d){
    if(this.distance(x,y) < d){
      ellipse(this.x, this.y, 20);
      return(this);
    }
    else{
      for(let i=0;i<this.next.length;i++){
        this.next[i].check(x,y,d);
      }
    }
    return null;
  }
  
}
