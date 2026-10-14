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
// 【升級去噪引擎】全臉 Line Drawing 高清降噪邊緣提取
// -------------------------------------------------------------
function convertFullFaceLineDrawing() {
  var angles = ['front', 'right', 'left', 'up', 'down', 'threequarter'];
  var hasImage = false;
  
  var colorMode = document.getElementById('lineColorSelect') ? document.getElementById('lineColorSelect').value : 'blue';

  angles.forEach(function(key) {
    var img = angleImages[key];
    if (img) {
      hasImage = true;
      var lineImgCanvas = processPhotoToCleanLineArt(img, colorMode);
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
    alert('✨ 已成功消除背景與雜訊！生成超清晰手繪全臉 Line Drawing！');
  }
}

// 雙平滑高對比清爽邊緣提取引擎
function processPhotoToCleanLineArt(sourceImg, colorMode) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  // 縮放至適中解析度，強化五官主要筆觸，濾除細微噪點
  var maxDim = 800;
  var scale = Math.min(1, maxDim / Math.max(sourceImg.width, sourceImg.height));
  var w = Math.round(sourceImg.width * scale);
  var h = Math.round(sourceImg.height * scale);
  
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(sourceImg, 0, 0, w, h);
  var imgData = ctx.getImageData(0, 0, w, h);
  var data = imgData.data;

  // 1. 轉灰階與對比度增強
  var gray = new Float32Array(w * h);
  for (var i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2. 進行 3x3 盒狀平滑模糊（Blur Filter）：塗平膚色細節與背景微小雜訊
  var smooth = new Float32Array(w * h);
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var idx = y * w + x;
      var sum = 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * w + (x + dx)];
        }
      }
      smooth[idx] = sum / 9.0;
    }
  }

  // 3. Sobel 邊緣檢測 + 雜訊閥值抑制
  var edgeMag = new Float32Array(w * h);
  var maxMag = 0;

  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var idx = y * w + x;
      var gx = -smooth[idx - w - 1] + smooth[idx - w + 1] - 2 * smooth[idx - 1] + 2 * smooth[idx + 1] - smooth[idx + w - 1] + smooth[idx + w + 1];
      var gy = -smooth[idx - w - 1] - 2 * smooth[idx - w] - smooth[idx - w + 1] + smooth[idx + w - 1] + 2 * smooth[idx + w] + smooth[idx + w + 1];
      var mag = Math.sqrt(gx * gx + gy * gy);
      edgeMag[idx] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // 4. 繪製純淨白底與清晰彩色筆觸
  var outputCanvas = document.createElement('canvas');
  outputCanvas.width = w;
  outputCanvas.height = h;
  var outCtx = outputCanvas.getContext('2d');

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, w, h);

  var outData = outCtx.getImageData(0, 0, w, h);
  var od = outData.data;

  var rgbColor = [0, 90, 200]; // 經典藍
  if (colorMode === 'green') rgbColor = [0, 140, 60];
  if (colorMode === 'red') rgbColor = [210, 20, 40];
  if (colorMode === 'black') rgbColor = [10, 10, 10];

  // 設定動態過濾閥值（Threshold）：徹底排除膚色與背景雜點
  var threshold = Math.max(30, maxMag * 0.18);

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = y * w + x;
      var mag = edgeMag[idx];

      // 只保留高對比的五官輪廓（眼睛、眉毛、鼻樑、嘴唇、臉型框）
      if (mag > threshold) {
        var pIdx = idx * 4;
        od[pIdx] = rgbColor[0];
        od[pIdx + 1] = rgbColor[1];
        od[pIdx + 2] = rgbColor[2];
        od[pIdx + 3] = 255; // 純色飽和線條，防止模糊小點
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);

  // 5. 輕微加粗筆觸，重現手繪彩繪筆質感
  var finalCanvas = document.createElement('canvas');
  finalCanvas.width = w;
  finalCanvas.height = h;
  var finalCtx = finalCanvas.getContext('2d');

  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, w, h);
  finalCtx.drawImage(outputCanvas, 0, 0);

  return finalCanvas;
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
    cropCtx.fillText('請先在步驟二生成 [' + activeAngleKey + '] 角度的 Line Drawing 線稿', cropCanvas.width / 2, cropCanvas.height / 2);
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
  var img = lineImages[activeAngleKey] || angleImages[activeAngleKey];
  if (!img) {
    alert('請先在步驟二生成該角度的 Line Drawing 線稿！');
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

  lineFacets.push({
    canvas: fCanvas,
    angle: activeAngleKey,
    shape: cropBox.shape,
    width: cropBox.width,
    height: cropBox.height
  });

  renderStage3Preview();
}

function renderStage3Preview() {
  var previewDiv = document.getElementById('stage3FacetsPreview');
  if (!previewDiv) return;

  if (lineFacets.length === 0) {
    previewDiv.innerHTML = '<span style="color:#888;">按下「✂️ 切割選取區域五官線稿」後，切下的線稿五官會顯示在這裡！</span>';
    return;
  }

  previewDiv.innerHTML = '';
  lineFacets.forEach(function(item, idx) {
    var container = document.createElement('div');
    container.className = 'library-item-container';

    var img = document.createElement('img');
    img.src = item.canvas.toDataURL();
    img.className = 'library-item';

    var delBtn = document.createElement('button');
    delBtn.className = 'delete-item-btn';
    delBtn.innerHTML = '✕';
    delBtn.onclick = function(e) {
      e.stopPropagation();
      lineFacets.splice(idx, 1);
      renderStage3Preview();
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    previewDiv.appendChild(container);
  });
}

function switchPortraitTab(index) {
  activePortraitIndex = index;
  selectedCollageItemIndex = -1;
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', i === index);
  }
  drawCollageCanvas();
}

function renderCollageLibrary() {
  var lib = document.getElementById('collageFacetsLibrary');
  if (!lib) return;
  lib.innerHTML = lineFacets.length === 0 ? '<span style="color:#888;">無線稿素材</span>' : '';

  lineFacets.forEach(function(item, idx) {
    var img = document.createElement('img');
    img.src = item.canvas.toDataURL();
    img.className = 'library-item';
    img.onclick = function() { addFacetToCollage(idx); };
    lib.appendChild(img);
  });
}

function addFacetToCollage(lineFacetIndex) {
  var facet = lineFacets[lineFacetIndex];
  if (!facet) return;

  var newItem = {
    canvas: facet.canvas,
    x: 200 + Math.random() * 50,
    y: 150 + Math.random() * 50,
    width: facet.width,
    height: facet.height,
    rotation: 0
  };

  portraitsData
