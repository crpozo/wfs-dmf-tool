class Graph{

  constructor() {
    this.vertices = [];
    this.edgeCount = 0;
    this.maxId = 0;
    this.count = 0;
  }

  clear(){
    this.vertices = [];
    this.count = 0;
    this.maxId = 0;
    this.edgeCount = 0;
  }

  over(){
    var overt = null;
    for(var i=0;i<this.vertices.length;i++){
        overt = this.vertices[i].over();
        if(overt != null){
            break;
        }
    }
    return overt;
  }

  addVertex(x,y){
    this.count++;
    //let vert= new Vert(this.count, x, y);
    var p = pixelsToFt(x, y);
    let vert= new Vert(this.count, p.x, p.y);
    this.vertices.push(vert);
    return vert;
  }

  getVertex(id){
      let vert = null;
      for(var i=0;i<this.vertices.length;i++) {
        if(this.vertices[i].id == id){
            vert = this.vertices[i]
            break;
        }
      }
      return vert;
  }

  removeVertex(vert){
    this.vertices = this.vertices.filter((item) => item != vert);
  }

  addEdge(vert1, vert2, type){
    this.edgeCount++;
    this.maxId++;
    return vert1.addEdgeId(vert2, type, this.maxId);
  }

  addEdgeFt(vert1, vert2, type, ft){
      this.edgeCount++;
      this.maxId++;
      var edge = vert1.addEdgeFt(vert2, type, this.maxId, ft);
      return edge;
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

    let id1 = vert1.removeEdge(vert2);
    let id2 = vert2.removeEdge(vert1);
    this.edgeCount--;
    if(max(id1, id2) > 0 && max(id1, id2) == this.maxId){
        this.maxId--;
        if(min(id1, id2) > 0 && min(id1, id2) == this.maxId){
            this.maxId--;
        }
    }
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
    // Si no hay edges ocultar Update Layout
    if(this.edgeCount == 0){

        $('#submitDims').css('display','none');
    }
  }

  check(x,y,d){
    let resp = null;
    for(var i=0;i<this.vertices.length;i++){
      let vertx = this.vertices[i];
      if(actual == null || (vertx.id != actual.id)){
      //if(actual != null && (vertx.id != actual.id) ){
        if(vertx.check(x,y,d)){
          push();
          stroke(255,10,10);
          vertx.paint(snapVCircle);
          pop();
          resp = vertx;
          break;
        }
      }
    }
    return resp;
  }

    addDoor(edge, x,y,type, width) {
        //Door same width of edge
        /*
        if(false) { // edge.ft == width){

            this.removeEdge(edge.node1, edge.node2, false);

            var gate = this.addEdgeFt(edge.node1, edge.node2, type, width);
            gate.setFenceMaterialForDoor(typeF);


            //edge.type = type;
            //edge.setDoorType(doorType);
        }
         */
        //if (width == edge.ft) {
        if(false){
            // The door covers the whole edge.
            // Create the door edge from the first node to the second node.
            this.removeEdge(edge.node1, edge.node2, false    );

            var doorEdge = this.addEdgeFt(edge.node1, edge.node2, type, width);
            doorEdge.setFenceMaterialForDoor(edge.type);
            // Remove the original edge and substitute the new door edge for it.

            //substituteDims("d" + edge.id, "d" + doorEdge.id);
            return; // Exit early since no further splitting is needed.
        }
        else {
            // <<< 06/09/2025 : C182
            var snapV_tmp = snapV;
            if((edge.length/edge.ft * width) < snapV){
                snapV = Math.floor(edge.length/edge.ft * width);
            }
            // 06/09/2025 >>>

            var pt = edge.proj(x, y);
            var x1 = pt.x;
            var y1 = pt.y;

            // Snapping a la izquierda
            var e1 = graph.check(x1, y1, snapV);
            if (e1 != null) {
                var p1Ft = ftToPixels(e1.x, e1.y);
                x1 = p1Ft.x;
                y1 = p1Ft.y;
            }

            var p1;
            var p2;
            var n1 = edge.node1;
            var n2 = edge.node2;
            if (edge.ms == 0) {
                if (edge.node1.y < edge.node2.y) {
                    p1 = ftToPixels(edge.node1.x, edge.node1.y);
                    p2 = ftToPixels(edge.node2.x, edge.node2.y);
                } else {
                    p2 = ftToPixels(edge.node1.x, edge.node1.y);
                    p1 = ftToPixels(edge.node2.x, edge.node2.y);
                    n1 = edge.node2;
                    n2 = edge.node1;
                }
            } else {
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
            //var w = width * gridSpacing;
            var w = edge.length / edge.ft * width * gridSpacing;
            var x2 = x1 + w / (sqrt(1 + sq(edge.m)));
            var y2 = y1 + edge.m * w / (sqrt(1 + sq(edge.m)));

            // Snapping a la derecha
            var e2 = graph.check(x2, y2, snapV);
            if (e2 != null) {
                var p2Ft = ftToPixels(e2.x, e2.y);
                x2 = p2Ft.x;
                y2 = p2Ft.y;

                // Recalcular izquierda
                x1 = x2 - w / (sqrt(1 + sq(edge.m)));
                y1 = y2 - edge.m * w / (sqrt(1 + sq(edge.m)));
            }

            var v1 = e1;
            if (e1 == null) {
                v1 = this.addVertex(x1, y1);
            }
            var v2 = e2;
            if (e2 == null) {
                v2 = this.addVertex(x2, y2);
            }
            var typeF = edge.type;

            var left = null;
            var right = null;
            var sum = "";
            var e1Ft = 0;

            this.removeEdge(edge.node1, edge.node2, false);
            if (e1 == null) {
                //e1Ft = round(( sqrt(sq(v1.x-v2.x)+sq(v1.y-v2.y)) /width) * sqrt(sq(n1.x-v1.x)+sq(n1.y-v1.y)), 0);
                e1Ft = round((width / sqrt(sq(v1.x - v2.x) + sq(v1.y - v2.y))) * sqrt(sq(n1.x - v1.x) + sq(n1.y - v1.y)), 0);
                //left = this.addEdge(n1,v1,typeF);
                left = this.addEdgeFt(n1, v1, typeF, e1Ft);
                sum = "d" + left.id + "+";
            }
            //var gate = this.addEdge(v1,v2,type);
            var gate = this.addEdgeFt(v1, v2, type, width);
            gate.setFenceMaterialForDoor(typeF);

            sum = sum + "d" + gate.id;
            if (e2 == null) {
                var e2Ft = edge.ft - e1Ft - width;
                //right = this.addEdge(v2, n2, typeF);
                right = this.addEdgeFt(v2, n2, typeF, e2Ft);
                sum = sum + "+d" + right.id;
            }
            /*
            gate.setSide(left,0);
            gate.setSide(right, 0);
            */

            //this.removeEdge(edge.node1, edge.node2, false);

            substituteDims("d" + edge.id, sum);
            /*
            var existeDim = dimensions.get("d" + edge.id);
            if(existeDim) {
                dimensions.set(sum, existeDim);
                dimensions.delete("d" + edge.id);
            }
            */
            //this.removeEdge(n1,n2,false);
            snapV = snapV_tmp;
        }
    }

    getEdgeSameLine(node, delEdge){
        var sameLineEdge = null;
        for(var i=0;i<this.vertices.length;i++){
            let vert = this.vertices[i];
            for(var j=0;j<vert.edges.length;j++){
                let edge = vert.edges[j];
                if(edge != delEdge){
                    if((edge.node1 == node || edge.node2 == node) && (round(edge.m,4) == round(delEdge.m,4) || round(edge.ms) == round(delEdge.ms)))    {
                        sameLineEdge = edge;
                        break;
                    }
                }
            }
            if(sameLineEdge != null){
                break
            }
        }
        return sameLineEdge;
    }

    checkEdges(x,y,d){
        for(var i=0;i<this.vertices.length;i++){
          let vert = this.vertices[i];
          for(var j=0;j<vert.edges.length;j++){
            let edge = vert.edges[j];
            if(true) { //edge.type != types.WALL){ //if(edge.type == tools.FENCE || edge.type == tools.FENCE_2){
              if(!edge.check(x,y,d)){
                edge.setDel(false);
                //if(edge.type != types.WALL && (edge.dims.length == 0 || edge.dims.length >= 2)){
                if((edge.type == types.FENCE || edge.type == types.FENCE_2 || edge.type == types.FENCE_3) && (edge.dims.length == 0 || edge.dims.length >= 2)){
                  edge.clearDims();
                  var val = dimensions.get("d" + edge.id);
                  if(edge.ft){
                      val = edge.ft;
                  }
                  if(val){
                      edge.setDim(val, sep);
                  }
                  else {
                      edge.setDim("d" + edge.id, sep);
                  }
                }
              }
              else{
                if (mouseIsPressed){
                  //if(toolActual == tools.ERASER){
                  if(toolActualGroup[1] == tools.ERASER){
                    // Al borrar puertas se debe rehacer cerca
                    if(edge.type == tools.GATE || edge.type == tools.DOUBLE){
                        var edge1 = this.getEdgeSameLine(edge.node1, edge);
                        var edge2 = this.getEdgeSameLine(edge.node2, edge);
                        if(edge1 != null){
                            if(edge2 != null){
                                if(edge1.type != tools.GATE && edge1.type != tools.DOUBLE){
                                    edge1.merge(edge);
                                    if(edge2.type == edge1.type) {
                                        edge1.merge(edge2);
                                        this.removeEdge(edge2.node1, edge2.node2);
                                    }
                                }
                                else{
                                    if(edge2.type != tools.GATE && edge2.type != tools.DOUBLE){
                                        edge2.merge(edge);
                                    }
                                    else{
                                        edge.type = tools.FENCE;
                                    }
                                }
                            }
                            else{
                                if(edge1.type != tools.GATE && edge1.type != tools.DOUBLE) {
                                    edge1.merge(edge);
                                }
                                else{
                                    edge.type = tools.FENCE;
                                }
                            }
                        }
                        else{
                            if(edge2 != null){
                                if(edge2.type != tools.GATE && edge2.type != tools.DOUBLE) {
                                    edge2.merge(edge);
                                }
                                else{
                                    edge.type = tools.FENCE;
                                }
                            }
                        }
                    }
                    /*
                    else {
                        this.removeEdge(edge.node1, edge.node2);
                    }
                    */
                    this.removeEdge(edge.node1, edge.node2);
                  }
                  //if(edge.type != types.WALL && (toolActual == tools.GATE || toolActual == tools.DOUBLE)){
                  if(edge.type != types.WALL && (toolActualGroup[1] == tools.GATE || toolActualGroup[1] == tools.DOUBLE)){
                    //this.addDoor(edge,x,y,toolActual,wDoor);
                      if(wDoor == edge.ft) {
                          var p1;
                          if (edge.ms == 0) {
                              if (edge.node1.y < edge.node2.y) {
                                  p1 = ftToPixels(edge.node1.x, edge.node1.y);
                              } else {
                                  p1 = ftToPixels(edge.node2.x, edge.node2.y);
                              }
                          } else {
                              if (edge.node1.x < edge.node2.x) {
                                  p1 = ftToPixels(edge.node1.x, edge.node1.y);
                              } else {
                                  p1 = ftToPixels(edge.node2.x, edge.node2.y);
                              }
                          }
                          x = p1.x;
                          y = p1.y;
                      }
                    this.addDoor(edge,x,y,toolActualGroup[1], wDoor);
                  }
                  mouseIsPressed = false;
                }
              }
            }
          }
        }
    }

    setDim(id, val){
        if(typeof(id) == "string") {
            for (var i = 0; i < this.vertices.length; i++) {
                let vert = this.vertices[i];
                for (var j = 0; j < vert.edges.length; j++) {
                    let edge = vert.edges[j];
                    let dim = edge.getDim();
                    if (dim != null && dim.texto == id) {
                        dim.setTexto(val);
                        edge.ft = parseInt(val);
                    }
                }
            }
        }
        else {
            for (var i = 0; i < this.vertices.length; i++) {
                let vert = this.vertices[i];
                for (var j = 0; j < vert.edges.length; j++) {
                    let edge = vert.edges[j];
                    let dim = edge.getDim();
                    if (dim != null && dim == id) {
                        dim.setTexto(val);
                        edge.ft = parseInt(val);
                    }
                }
            }
        }
    }

    getDims(){
        var dims = [];
        for(var i=0;i<this.vertices.length;i++){
            let vert = this.vertices[i];
            for(var j=0;j<vert.edges.length;j++){
                let edge = vert.edges[j];
                let dim = edge.getDim();
                if(dim != null && dim.texto.substr(0,1) == "d") {
                    dims.push(dim.texto);
                }
            }
        }
        return dims;
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
            vert.print();
        }
    }

    getData(){
        var data = [];
        this.vertices.forEach(vertexToJson);

        function vertexToJson(vert){
            var d = vert.getData();
            data = data.concat(d);
        }
        return data;
    }

    setData(jsonData){
        this.clear();
        var pend = 0;
        let xmax = 0;
        let ymax = 0;
        let mult = 1;
        jsonData.forEach(function(item) {
            if(item.x1 > xmax){
                xmax = item.x1;
            }
            if(item.y1 > ymax){
                ymax = item.y1;
            }
            if(item.x2 > xmax){
                xmax = item.x2;
            }
            if(item.y2 > ymax){
                ymax = item.y2;
            }
        });
        if(xmax > _W){
            mult = (_W - 100) / xmax;
        }
        if(ymax > _H){
            let mult2 = (_H - 100) / ymax;
            if(mult2 < mult){
                mult = mult2;
            }
        }

        jsonData.forEach(function(item) {

            var vert1 = graph.getVertex(item.node1);
            if (!vert1) {
                vert1 = new Vert(item.node1, item.x1 * mult, item.y1 * mult);
                graph.vertices.push(vert1);
                graph.count++;
                //vertices[item.node1] = Vertex(item.node1, item.x1, item.y1);
            }

            var vert2 = graph.getVertex(item.node2);
            if (!vert2) {
                vert2 = new Vert(item.node2, item.x2 * mult, item.y2 * mult);
                graph.vertices.push(vert2);
                graph.count++;
                //vertices[item.node2] = Vertex(item.node2, item.x2, item.y2);
            }

            graph.edgeCount++;
            var type = item.type;
            if(item.door == 1){
                doorType = item.doorType;
            }
            if(typeof(item.length) == "string") {
                if(Number.isNaN(Number(item.length))) {
                    graph.maxId++;
                    var edge = vert1.addEdgeId(vert2, type, graph.maxId);
                    pend++;
                }
                else{
                    var edge = vert1.addEdgeFt(vert2, type, graph.edgeCount, Number(item.length));
                    if(item.door == 1){
                        edge.setFenceMaterialForDoorLoad(item.material);
                    }
                }
            }
            else {
                var edge = vert1.addEdgeFt(vert2, type, graph.edgeCount, item.length);
                if(item.door == 1){
                    edge.setFenceMaterialForDoorLoad(item.material);
                }
            }
        });
        if(pend == 0 && graph.edgeCount > 0){
            $('#btnEstimate').css('display','block');
        }
        if(typeof zoomToFit === 'function'){
            zoomToFit();
        }
    }
}
