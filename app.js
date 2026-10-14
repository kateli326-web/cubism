// 全域變數定義
var angleImages = {
  front: null, right: null, left: null,
  up: null, down: null, threequarter: null
};

var cropCanvas = null, cropCtx = null;
var activeAngleKey = 'front';
var cropBox = {
  shape: 'diamond',
  x: 250, y: 150,
  width: 150, height: 110,
  rotation: 0
};

var rawFacets = [];
var lineFacets = [];

var collageCanvas = null, collageCtx = null;
var activePortraitIndex = 0;
var portraitsData = [[], [], []];
var selectedCollageItemIndex = -1;

// 拖曳控制狀態
var isDraggingBox = false;
var isDraggingCollageItem = false;
var startX = 0, startY = 0;

window.addEventListener('DOMContentLoaded', setupApp);
window.addEventListener('load', setupApp);

function setupApp() {
  cropCanvas = document.getElementById('cropCanvas');
  if (cropCanvas) cropCtx = cropCanvas.getContext('2d');

  collageCanvas = document.getElementById('collageCanvas');
  if (collageCanvas) collageCtx = collageCanvas.getContext('2d');

  // 綁定 6 個角度照片上傳事件
  var angles = ['front', 'right', 'left', 'up', 'down', 'threequarter'];
  angles.forEach(function(key) {
    var inputEl = document.getElementById('img_' + key);
    if (inputEl) {
      inputEl.onchange = function(e) {
        handleUpload(e, key);
      };
    }
  });

  if (cropCanvas) {
    cropCanvas.onmousedown = handleCropMouseDown;
    cropCanvas.onmousemove = handleCropMouseMove;
    cropCanvas.onmouseup = handleCropMouseUp;
    cropCanvas.onmouseleave = handleCropMouseUp; // 移出畫布強制釋放拖曳
  }

  if (collageCanvas) {
    collageCanvas.onmousedown = handleCollageMouseDown;
    collageCanvas.onmousemove = handleCollageMouseMove;
    collageCanvas.onmouseup = handleCollageMouseUp;
    collageCanvas.onmouseleave = handleCollageMouseUp;
  }
}

function handleUpload(e, key) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(evt) {
    var img = new Image();
    img.onload = function() {
      angleImages[key] = img;
      var prev = document.getElementById('preview_' + key);
      if (prev) {
        prev.src = evt.target.result;
        prev.style.display = 'block';
      }
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function switchStage(stageNum) {
  var btns = document.querySelectorAll('.step-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', i + 1 === stageNum);
  }

  var panels = document.querySelectorAll('.stage-panel');
  for (var j = 0; j < panels.length; j++) {
    panels[j].classList.toggle('active', j + 1 === stageNum);
  }

  if (stageNum === 2) {
    drawCropCanvas();
    renderStage2Preview();
  }
  if (stageNum === 3) renderStage3Libraries();
  if (stageNum === 4) {
    renderCollageLibrary();
    drawCollageCanvas();
  }
}

function changeActiveSourceAngle() {
  var select = document.getElementById('angleSelect');
  if (select) activeAngleKey = select.value;
  drawCropCanvas();
}

function updateCropShape() {
  var select = document.getElementById('shapeSelect');
  if (select) cropBox.shape = select.value;
  drawCropCanvas();
}

function getShapePoints(shape) {
  switch (shape) {
    case 'diamond': return [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
    case 'triangle': return [[0.5, 0], [1, 1], [0, 1]];
    case 'trapezoid': return [[0.2, 0], [0.8, 0], [1, 1], [0, 1]];
    case 'polygon': return [[0.3, 0], [0.85, 0.15], [1, 0.85], [0.5, 1], [0, 0.6]];
    case 'parallelogram': return [[0.25, 0], [1, 0], [0.75, 1], [0, 1]];
    case 'shield': return [[0, 0], [1, 0], [1, 0.6], [0.5, 1], [0, 0.6]];
    case 'hexagon': return [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]];
    case 'circle': default:
      var pts = [];
      for (var i = 0; i < 16; i++) {
        var rad = (i / 16) * Math.PI * 2;
        pts.push([0.5 + 0.5 * Math.cos(rad), 0.5 + 0.5 * Math.sin(rad)]);
      }
      return pts;
  }
}

function drawCropCanvas() {
  if (!cropCtx || !cropCanvas) return;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  var img = angleImages[activeAngleKey];
  if (img) {
    var scale = Math.min(cropCanvas.width / img.width, cropCanvas.height / img.height) * 0.9;
    var renderW = img.width * scale;
    var renderH = img.height * scale;
    var renderX = (cropCanvas.width - renderW) / 2;
    var renderY = (cropCanvas.height - renderH) / 2;

    cropCtx.drawImage(img, renderX, renderY, renderW, renderH);

    cropCtx.save();
    cropCtx.translate(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
    cropCtx.rotate((cropBox.rotation * Math.PI) / 180);

    var pts = getShapePoints(cropBox.shape);
    var hw = cropBox.width / 2;
    var hh = cropBox.height / 2;

    cropCtx.beginPath();
    cropCtx.moveTo(-hw + pts[0][0] * cropBox.width, -hh + pts[0][1] * cropBox.height);
    for (var i = 1; i < pts.length; i++) {
      cropCtx.lineTo(-hw + pts[i][0] * cropBox.width, -hh + pts[i][1] * cropBox.height);
    }
    cropCtx.closePath();

    cropCtx.strokeStyle = '#ffc107';
    cropCtx.lineWidth = 4;
    cropCtx.setLineDash([8, 4]);
    cropCtx.stroke();
    cropCtx.fillStyle = 'rgba(255, 193, 7, 0.2)';
    cropCtx.fill();
    cropCtx.restore();
  } else {
    cropCtx.font = '18px Arial';
    cropCtx.fillStyle = '#888';
    cropCtx.textAlign = 'center';
    cropCtx.fillText('請先在步驟一上傳 [' + activeAngleKey + '] 角度的照片', cropCanvas.width / 2, cropCanvas.height / 2);
  }
}

function transformActiveBox(type, val) {
  if (type === 'scale') {
    cropBox.width *= val;
    cropBox.height *= val;
  } else if (type === 'rotate') {
    cropBox.rotation += val;
  }
  drawCropCanvas();
}

function cutCurrentFacet() {
  var img = angleImages[activeAngleKey];
  if (!img) {
    alert('請先在步驟一上傳該角度照片！');
    return;
  }

  var scale = Math.min(cropCanvas.width / img.width, cropCanvas.height / img.height) * 0.9;
  var renderW = img.width * scale;
  var renderH = img.height * scale;
  var renderX = (cropCanvas.width - renderW) / 2;
  var renderY = (cropCanvas.height - renderH) / 2;

  var relX = (cropBox.x - renderX) / scale;
  var relY = (cropBox.y - renderY) / scale;
  var cropW = cropBox.width / scale;
  var cropH = cropBox.height / scale;

  var fCanvas = document.createElement('canvas');
  var fCtx = fCanvas.getContext('2d');
  fCanvas.width = cropW;
  fCanvas.height = cropH;

  var pts = getShapePoints(cropBox.shape);
  fCtx.beginPath();
  fCtx.moveTo(pts[0][0] * cropW, pts[0][1] * cropH);
  for (var i = 1; i < pts.length; i++) {
    fCtx.lineTo(pts[i][0] * cropW, pts[i][1] * cropH);
  }
  fCtx.closePath();

  fCtx.save();
  fCtx.clip();
  fCtx.drawImage(img, relX, relY, cropW, cropH, 0, 0, cropW, cropH);
  fCtx.restore();

  fCtx.strokeStyle = '#000000';
  fCtx.lineWidth = Math.max(6, Math.round(cropW * 0.03));
  fCtx.stroke();

  rawFacets.push({
    canvas: fCanvas,
    angle: activeAngleKey,
    shape: cropBox.shape,
    width: cropBox.width,
    height: cropBox.height
  });

  renderStage2Preview();
