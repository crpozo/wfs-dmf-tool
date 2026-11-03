function gridlines(){
  buffer.textSize(fsGrid);
  buffer.background(255); // WFS redesign: white drawing surface (was gray 220)
  buffer.stroke(30, 30, 30, 20);
  buffer.strokeWeight(2);
  /*
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
  */
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
    if(d == 0){
        return null;
    }

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

    let dim = new Dim(x1, y1, d, xA, yA, fontsize, xp, yp);
    dim.paint();
    return dim;
}

function dimension(xo,yo,x,y,d,gap){
    var po = pixelsToFt(xo,yo);
    var p = pixelsToFt(x,y);

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

    x1 = gap / (sqrt(1+sq(m))) + xp;
    if(y < yo){
        x1 = xp - gap / (sqrt(1+sq(m)));
    }

    y1 = m * (x1 - xp) + yp;
    if(y < yo){
        signX = -1;
    }

    if(y == yo){
        x1 = xp;
        y1 = yp - signY * gap;
    }

    x1 = x1 + ang/90 * (gap + w/4) * signX;
    y1 = y1 + ang/90 * (gap) * signY;

    let dim = new Dim(x1, y1, d, xA, yA, fontsize, xp, yp);
    dim.paint();
    return dim;
}

/*
function dimension(xo,yo,x,y,d,gap) {
    if(d){
        dim_2(xo,yo,x,y,d,gap);
    }
    else{
        dim_1(xo,yo,x,y);
    }
}
 */

// Screen <-> model conversion. Model units ("ft" in the code) are the sketch
// coordinates stored on vertices; gridSpacing is the zoom scale (pixels per model
// unit) and panX/panY is the viewport offset in pixels. See zoom/pan in s_sketch.js.
function pixelsToFt(x,y){
    var xft = (x - toolbarWidth - panX) / gridSpacing;
    var yft = (y - panY) / gridSpacing;
    return new Pt(xft, yft);
}

function ftToPixels(xft, yft){
    var xp = toolbarWidth + panX + xft * gridSpacing;
    var yp = panY + yft * gridSpacing;
    return new Pt(xp, yp);
}

function setActual(vert){
  if((actual == 0 || actual == null) && vert != null) {
      actual = vert;
      var po = ftToPixels(vert.x, vert.y);
      xo = po.x;
      yo = po.y;
  }
  else{
      actual = null;
  }
}

let activeToolTooltip = null;
let toolTooltipHideTimer = null;
let toolTooltipPointerActive = false;
let toolTooltipPointerReleaseTimer = null;

function suppressCanvasPointerInteraction(event, preventDefault = true) {
    clearTimeout(toolTooltipPointerReleaseTimer);
    toolTooltipPointerActive = true;
    drawable = false;

    if (event) {
        if (preventDefault) {
            event.preventDefault();
        }
        event.stopPropagation();
    }
}

function releaseCanvasPointerInteraction() {
    clearTimeout(toolTooltipPointerReleaseTimer);
    toolTooltipPointerReleaseTimer = setTimeout(function () {
        toolTooltipPointerActive = false;
        drawable = true;
    }, 0);
}

function getToolTooltipElement() {
    let tooltip = document.getElementById('drawToolTooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'drawToolTooltip';
        tooltip.className = 'draw-tool-tooltip';
        tooltip.innerHTML = '<span class="draw-tool-tooltip-label"></span>' +
            '<button type="button" class="draw-tool-tooltip-help" aria-label="Show tool help video">?</button>';

        tooltip.addEventListener('mouseenter', function () {
            clearTimeout(toolTooltipHideTimer);
            toolTooltipHideTimer = null;
        });

        tooltip.addEventListener('mouseleave', function () {
            scheduleToolTooltipHide();
        });

        tooltip.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event);
        });

        tooltip.querySelector('.draw-tool-tooltip-help').addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openToolHelpVideo(activeToolTooltip);
        });

        window.addEventListener('pointerup', function () {
            if (toolTooltipPointerActive) {
                releaseCanvasPointerInteraction();
            }
        });

        document.body.appendChild(tooltip);
    }

    return tooltip;
}

function showToolTooltip(text, x, y) {
    const tooltip = getToolTooltipElement();
    const canvas = document.querySelector('canvas');

    if (!canvas) {
        return;
    }

    clearTimeout(toolTooltipHideTimer);
    toolTooltipHideTimer = null;
    activeToolTooltip = text;

    const canvasRect = canvas.getBoundingClientRect();
    tooltip.querySelector('.draw-tool-tooltip-label').textContent = text;
    tooltip.style.left = `${canvasRect.left + x}px`;
    tooltip.style.top = `${canvasRect.top + y}px`;
    tooltip.classList.add('is-visible');
}

function hideToolTooltip(text) {
    if (activeToolTooltip === text) {
        scheduleToolTooltipHide();
    }
}

function scheduleToolTooltipHide() {
    const tooltip = document.getElementById('drawToolTooltip');

    if (toolTooltipHideTimer || (tooltip && tooltip.matches(':hover'))) {
        return;
    }

    toolTooltipHideTimer = setTimeout(function () {
        if (tooltip && !tooltip.matches(':hover')) {
            tooltip.classList.remove('is-visible');
            activeToolTooltip = null;
        }

        toolTooltipHideTimer = null;
    }, 500);
}

function isToolTooltipPointerActive() {
    return toolTooltipPointerActive;
}

function newText(texto, fs, x, y){
    push();
    textAlign(CENTER, TOP);
    textSize(fs);
    text(texto, x, y);
    pop();
}
