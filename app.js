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

// 1. 上傳照片
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
      if (currentStage === 3) {
        drawCropCanvas();
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
    renderClassifiedFacets();
    drawCollageCanvas();
    updatePicassoReference('front');
  }
}

// -------------------------------------------------------------
// 【步驟二：還原真實相片手繪 Line Drawing 效果】
// -------------------------------------------------------------
function convertFullFaceLineDrawing() {
  var angles = ['front', 'right', 'left', 'up', 'down', 'threequarter'];
  var hasImage = false;
  
  var colorMode = document.getElementById('lineColorSelect') ? document.getElementById('lineColorSelect').value : 'black';

  angles.forEach(function(key) {
    var img = angleImages[key];
    if (img) {
      hasImage = true;
      var lineImgCanvas = processPhotoToNaturalRealLineArt(img, colorMode);
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
    alert('✨ 已成功生成真實相片手繪 Line Drawing 線稿！');
  }
}

// 真實寫生邊緣提取（還原真實相片線條）
function processPhotoToNaturalRealLineArt(sourceImg, colorMode) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var maxDim = 800;
  var scale = Math.min(1, maxDim / Math.max(sourceImg.width, sourceImg.height));
  var w = Math.round(sourceImg.width * scale);
  var h = Math.round(sourceImg.height * scale);
  
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(sourceImg, 0, 0, w, h);
  var imgData = ctx.getImageData(0, 0, w, h);
  var data = imgData.data;

  // 灰階與自適應對比
  var gray = new Float32Array(w * h);
  for (var i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  var outputCanvas = document.createElement('canvas');
  outputCanvas.width = w;
  outputCanvas.height = h;
  var outCtx = outputCanvas.getContext('2d');

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, w, h);

  var outData = outCtx.getImageData(0, 0, w, h);
  var od = outData.data;

  var rgbColor = [20, 20, 20];
  if (colorMode === 'blue') rgbColor = [0, 90, 200];
  if (colorMode === 'green') rgbColor = [0, 140, 60];
  if (colorMode === 'red') rgbColor = [210, 20, 40];

  // 簡單梯度邊緣提煉
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var idx = y * w + x;
      var gx = gray[idx + 1] - gray[idx - 1];
      var gy = gray[idx + w] - gray[idx - w];
      var grad = Math.sqrt(gx * gx + gy * gy);

      if (grad > 28) {
        var pIdx = idx * 4;
        od[pIdx] = rgbColor[0];
        od[pIdx + 1] = rgbColor[1];
        od[pIdx + 2] = rgbColor[2];
        od[pIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
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
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  var img = lineImages[activeAngleKey] || angleImages[activeAngleKey];
  if (img) {
    var scale = Math.min(cropCanvas.width / img.width, cropCanvas.height / img.height) * 0.9;
    var renderW = img.width * scale;
    var renderH = img.height * scale;
    var renderX = (cropCanvas.width - renderW) / 2;
    var renderY = (cropCanvas.height - renderH) / 2;

    cropCtx.drawImage(img, renderX, renderY, renderW, renderH);

    cropCtx.save();
    cropCtx.translate(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
    cropCtx
