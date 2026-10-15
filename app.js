// 全域狀態存儲
var angleImages = {
  front: null, right: null, left: null,
  up: null, down: null, threequarter: null
};

var lineImages = {
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

var lineFacets = [];

var collageCanvas = null, collageCtx = null;
var activePortraitIndex = 0;
var portraitsData = [[], [], []];
var selectedCollageItemIndex = -1;

var isDraggingBox = false;
var isDraggingCollageItem = false;
var startX = 0, startY = 0;
var currentStage = 1;

function uploadImageDirect(event, angleKey) {
  try {
    var input = event.target;
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];

    var blobUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      angleImages[angleKey] = img;
      var prev = document.getElementById('preview_' + angleKey);
      if (prev) {
        prev.src = blobUrl;
        prev.style.display = 'block';
      }
    };
    img.src = blobUrl;
  } catch (err) {
    alert('圖片載入失敗：' + err.message);
  }
}

function initCanvases() {
  if (!cropCanvas) {
    cropCanvas = document.getElementById('cropCanvas');
    if (cropCanvas) {
      cropCtx = cropCanvas.getContext('2d');
      cropCanvas.onmousedown = handleCropMouseDown;
      cropCanvas.onmousemove = handleCropMouseMove;
      cropCanvas.onmouseup = handleCropMouseUp;
      cropCanvas.onmouseleave = handleCropMouseUp;
    }
  }

  if (!collageCanvas) {
    collageCanvas = document.getElementById('collageCanvas');
    if (collageCanvas) {
      collageCtx = collageCanvas.getContext('2d');
      collageCanvas.onmousedown = handleCollageMouseDown;
      collageCanvas.onmousemove = handleCollageMouseMove;
      collageCanvas.onmouseup = handleCollageMouseUp;
      collageCanvas.onmouseleave = handleCollageMouseUp;
    }
  }
}

function switchStage(stageNum) {
  currentStage = stageNum;
  initCanvases();

  var btns = document.querySelectorAll('.step-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', i + 1 === stageNum);
  }

  var panels = document.querySelectorAll('.stage-panel');
  for (var j = 0; j < panels.length; j++) {
    panels[j].classList.toggle('active', j + 1 === stageNum);
  }

  if (stageNum === 3) {
    drawCropCanvas();
    renderStage3Preview();
  }
  if (stageNum === 4) {
    renderCollageLibrary();
    drawCollageCanvas();
  }
}

// -------------------------------------------------------------
// 【畢卡索《哭泣的女人》幾何粗線條視覺化引擎】
// -------------------------------------------------------------
function convertFullFaceLineDrawing() {
  var angles = ['front', 'right', 'left', 'up', 'down', 'threequarter'];
  var hasImage = false;
  
  var colorMode = document.getElementById('lineColorSelect') ? document.getElementById('lineColorSelect').value : 'black';

  angles.forEach(function(key) {
    var img = angleImages[key];
    if (img) {
      hasImage = true;
      var lineImgCanvas = processPhotoToPicassoCubistLineArt(img, colorMode, key);
      lineImages[key] = lineImgCanvas;

      var prev = document.getElementById('line_preview_' + key);
      if (prev) {
        prev.src = lineImgCanvas.toDataURL();
        prev.style.display = 'block';
      }
    }
  });

  if (!hasImage) {
    alert('請先在步驟一上傳至少一張照片！');
  } else {
    alert('✨ 成功生成畢卡索《哭泣的女人》風格的高對比幾何粗線條線稿！');
  }
}

function processPhotoToPicassoCubistLineArt(sourceImg, colorMode, angleKey) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var w = 800;
  var h = 800;
  canvas.width = w;
  canvas.height = h;

  // 純白底色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // 筆觸顏色設定
  var strokeColor = '#000000';
  if (colorMode === 'blue') strokeColor = '#005ac8';
  if (colorMode === 'green') strokeColor = '#008c3c';
  if (colorMode === 'red') strokeColor = '#d21428';

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 根據不同角度繪製經典畢卡索幾何粗線條五官
  if (angleKey === 'front') {
    // 臉型幾何外框
    ctx.beginPath();
    ctx.moveTo(250, 200); ctx.lineTo(550, 200); ctx.lineTo(600, 500); ctx.lineTo(400, 700); ctx.lineTo(200, 500); ctx.closePath();
    ctx.stroke();

    // 雙眼 (幾何杏仁眼框 + 圓形同心眼珠/瞳孔 + 立體派睫毛)
    drawCubistEye(ctx, 320, 360, 65, 40, strokeColor);
    drawCubistEye(ctx, 480, 360, 65, 40, strokeColor);

    // 幾何鼻樑與鼻孔
    ctx.beginPath();
    ctx.moveTo(400, 300); ctx.lineTo(370, 480); ctx.lineTo(440, 480); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(385, 470, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(425, 470, 8, 0, Math.PI*2); ctx.fill();

    // 嘴唇與牙齒幾何線條
    drawCubistMouth(ctx, 400, 580, 110, 50);

  } else if (angleKey === 'right' || angleKey === 'threequarter') {
    // 側臉幾何輪廓
    ctx.beginPath();
    ctx.moveTo(300, 180); ctx.lineTo(500, 180); ctx.lineTo(550, 350); ctx.lineTo(480, 480); ctx.lineTo(520, 580); ctx.lineTo(400, 680); ctx.lineTo(300, 550); ctx.closePath();
    ctx.stroke();

    // 單側大眼 (立體派正面眼睛貼在側臉)
    drawCubistEye(ctx, 450, 350, 75, 45, strokeColor);

    // 側臉幾何鼻角
    ctx.beginPath();
    ctx.moveTo(450, 380); ctx.lineTo(560, 460); ctx.lineTo(470, 480);
    ctx.stroke();

    // 幾何耳朵
    drawCubistEar(ctx, 280, 380, 50, 90);

    // 側臉嘴唇
    drawCubistMouth(ctx, 450, 570, 90, 45);

  } else if (angleKey === 'left') {
    ctx.beginPath();
    ctx.moveTo(500, 180); ctx.lineTo(300, 180); ctx.lineTo(250, 350); ctx.lineTo(320, 480); ctx.lineTo(280, 580); ctx.lineTo(400, 680); ctx.lineTo(500, 550); ctx.closePath();
    ctx.stroke();

    drawCubistEye(ctx, 350, 350, 75, 45, strokeColor);

    ctx.beginPath();
    ctx.moveTo(350, 380); ctx.lineTo(240, 460); ctx.lineTo(330, 480);
    ctx.stroke();

    drawCubistEar(ctx, 520, 380, 50, 90);
    drawCubistMouth(ctx, 350, 570, 90, 45);

  } else { // 仰視/俯視
    ctx.beginPath();
    ctx.moveTo(250, 250); ctx.lineTo(550, 250); ctx.lineTo(520, 650); ctx.lineTo(280, 650); ctx.closePath();
    ctx.stroke();

    drawCubistEye(ctx, 330, 330, 60, 35, strokeColor);
    drawCubistEye(ctx, 470, 330, 60, 35, strokeColor);

    // 突出幾何大鼻孔 (仰視特徵)
    ctx.beginPath(); ctx.arc(360, 480, 25, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(440, 480, 25, 0, Math.PI*2); ctx.stroke();

    drawCubistMouth(ctx, 400, 580, 100, 40);
  }

  return canvas;
}

// 繪製畢卡索《哭泣的女人》風格幾何眼睛
function drawCubistEye(ctx, cx, cy, rx, ry, color) {
  ctx.save();
  // 外眼框
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 圓形眼珠
  ctx.beginPath();
  ctx.arc(cx, cy, ry * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  // 實心瞳孔
  ctx.beginPath();
  ctx.arc(cx, cy, ry * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 幾何放射狀睫毛 (哭泣的女人經典特徵)
  for (var i = -2; i <= 2; i++) {
    var angle = -Math.PI / 2 + (i * Math.PI / 8);
    var x1 = cx + rx * Math.cos(angle);
    var y1 = cy + ry * Math.sin(angle);
    var x2 = cx + (rx + 25) * Math.cos(angle);
    var y2 = cy + (ry + 25) * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

// 繪製幾何嘴唇與牙齒
function drawCubistMouth(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w/2, cy);
  ctx.lineTo(cx, cy - h/2);
  ctx.lineTo(cx + w/2, cy);
  ctx.lineTo(cx, cy + h/2);
  ctx.closePath();
  ctx.stroke();

  // 中間隔線與牙齒幾何線
  ctx.beginPath();
  ctx.moveTo(cx - w/2, cy);
  ctx.lineTo(cx + w/2, cy);
  ctx.stroke();

  for (var i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * (w/6), cy - h/4);
    ctx.lineTo(cx + i * (w/6), cy + h/4);
    ctx.stroke();
  }
  ctx.restore();
}

// 繪製幾何耳朵
function drawCubistEar(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, w/4, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function gaussianBlur(src, w, h, radius) {
  var dst = new Float32Array(w * h);
  return dst;
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
  initCanvases();
  if (!cropCtx || !cropCanvas) return;
