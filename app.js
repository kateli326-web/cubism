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
// 【DoG 雙重高斯絕密去躁線稿引擎】徹底消滅背景與皮膚雜點
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
    alert('✨ 已成功消除背景與皮膚雜點，導出純淨五官線稿！');
  }
}

function processPhotoToCleanLineArt(sourceImg, colorMode) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var maxDim = 700;
  var scale = Math.min(1, maxDim / Math.max(sourceImg.width, sourceImg.height));
  var w = Math.round(sourceImg.width * scale);
  var h = Math.round(sourceImg.height * scale);
  
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(sourceImg, 0, 0, w, h);
  var imgData = ctx.getImageData(0, 0, w, h);
  var data = imgData.data;

  // 1. 轉灰階
  var gray = new Float32Array(w * h);
  for (var i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2. 雙層高斯平滑 (Difference of Gaussians 核心算法)
  var g1 = gaussianBlur(gray, w, h, 1);
  var g2 = gaussianBlur(gray, w, h, 3);

  // 3. 計算 DoG 差值並過濾微小光影噪點
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
  if (colorMode === 'black') rgbColor = [15, 15, 15];

  var tau = 0.98; 
  for (var i = 0; i < w * h; i++) {
    var v1 = g1[i];
    var v2 = g2[i];
    var dog = v1 - tau * v2;

    // 極致降噪閾值：低於閥值者一律還原成純白 #FFFFFF
    if (dog < -2.5) {
      var pIdx = i * 4;
      od[pIdx] = rgbColor[0];
      od[pIdx + 1] = rgbColor[1];
      od[pIdx + 2] = rgbColor[2];
      od[pIdx + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);

  // 4. 補強加粗主要結構筆觸（眼睫毛、瞳孔、唇線、輪廓）
  var finalCanvas = document.createElement('canvas');
  finalCanvas.width = w;
  finalCanvas.height = h;
  var finalCtx = finalCanvas.getContext('2d');

  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, w, h);
  finalCtx.drawImage(outputCanvas, 0, 0);

  return finalCanvas;
}

// 快速高斯模糊實作
function gaussianBlur(src, w, h, radius) {
  var dst = new Float32Array(w * h);
  var kSize = radius * 2 + 1;
  var kernel = [];
  var sigma = radius;
  var sum = 0;

  for (var x = -radius; x <= radius; x++) {
    var g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(g);
    sum += g;
  }
  for (var i = 0; i < kernel.length; i++) kernel[i] /= sum;

  // 水平方向
  var temp = new Float32Array(w * h);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var val = 0;
      for (var k = -radius; k <= radius; k++) {
        var px = Math.min(w - 1, Math.max(0, x + k));
        val += src[y * w + px] * kernel[k + radius];
      }
      temp[y * w + x] = val;
    }
  }

  // 垂直方向
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var val = 0;
      for (var k = -radius; k <= radius; k++) {
        var py = Math.min(h - 1, Math.max(0, y + k));
        val += temp[py * w + x] * kernel[k + radius];
      }
      dst[y * w + x] = val;
    }
  }

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

  portraitsData[activePortraitIndex].push(newItem);
  selectedCollageItemIndex = portraitsData[activePortraitIndex].length - 1;
  drawCollageCanvas();
}

function drawCollageCanvas() {
  initCanvases();
  if (!collageCtx || !collageCanvas) return;
  collageCtx.clearRect(0, 0, collageCanvas.width, collageCanvas.height);

  var currentItems = portraitsData[activePortraitIndex];
  currentItems.forEach(function(item, idx) {
    collageCtx.save();
    collageCtx.translate(item.x + item.width / 2, item.y + item.height / 2);
    collageCtx.rotate((item.rotation * Math.PI) / 180);
    collageCtx.drawImage(item.canvas, -item.width / 2, -item.height / 2, item.width, item.height);

    if (idx === selectedCollageItemIndex) {
      collageCtx.strokeStyle = '#007bff';
      collageCtx.lineWidth = 3;
      collageCtx.setLineDash([6, 6]);
      collageCtx.strokeRect(-item.width / 2 - 4, -item.height / 2 - 4, item.width + 8, item.height + 8);
    }
    collageCtx.restore();
  });
}

function transformActiveCanvasItem(type, val) {
  if (selectedCollageItemIndex === -1) return;
  var item = portraitsData[activePortraitIndex][selectedCollageItemIndex];
  if (type === 'scale') {
    item.width *= val;
    item.height *= val;
  } else if (type === 'rotate') {
    item.rotation += val;
  }
  drawCollageCanvas();
}

function deleteActiveCanvasItem() {
  if (selectedCollageItemIndex !== -1) {
    portraitsData[activePortraitIndex].splice(selectedCollageItemIndex, 1);
    selectedCollageItemIndex = -1;
    drawCollageCanvas();
  }
}

function exportCollage() {
  var link = document.createElement('a');
  link.download = '畢卡索立體派自畫像_' + ['A','B','C'][activePortraitIndex] + '.png';
  link.href = collageCanvas.toDataURL();
  link.click();
}

function handleCropMouseDown(e) {
  if (!cropCanvas) return;
  var rect = cropCanvas.getBoundingClientRect();
  var mx = e.clientX - rect.left;
  var my = e.clientY - rect.top;

  if (mx >= cropBox.x && mx <= cropBox.x + cropBox.width &&
      my >= cropBox.y && my <= cropBox.y + cropBox.height) {
    isDraggingBox = true;
    startX = mx - cropBox.x;
    startY = my - cropBox.y;
  }
}

function handleCropMouseMove(e) {
  if (!isDraggingBox || !cropCanvas) return;
  var rect = cropCanvas.getBoundingClientRect();
  cropBox.x = e.clientX - rect.left - startX;
  cropBox.y = e.clientY - rect.top - startY;
  drawCropCanvas();
}

function handleCropMouseUp() { isDraggingBox = false; }

function handleCollageMouseDown(e) {
  if (!collageCanvas) return;
  var rect = collageCanvas.getBoundingClientRect();
  var mx = e.clientX - rect.left;
  var my = e.clientY - rect.top;

  var currentItems = portraitsData[activePortraitIndex];
  selectedCollageItemIndex = -1;

  for (var i = currentItems.length - 1; i >= 0; i--) {
    var item = currentItems[i];
    if (mx >= item.x && mx <= item.x + item.width &&
        my >= item.y && my <= item.y + item.height) {
      selectedCollageItemIndex = i;
      isDraggingCollageItem = true;
      startX = mx - item.x;
      startY = my - item.y;
      break;
    }
  }
  drawCollageCanvas();
}

function handleCollageMouseMove(e) {
  if (!isDraggingCollageItem || selectedCollageItemIndex === -1 || !collageCanvas) return;
  var rect = collageCanvas.getBoundingClientRect();
  var item = portraitsData[activePortraitIndex][selectedCollageItemIndex];
  item.x = e.clientX - rect.left - startX;
  item.y = e.clientY - rect.top - startY;
  drawCollageCanvas();
}

function handleCollageMouseUp() { isDraggingCollageItem = false; }
