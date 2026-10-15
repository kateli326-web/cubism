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

// 安全的原生圖片上傳機制
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
    renderCollageLibrary();
    drawCollageCanvas();
  }
}

// -------------------------------------------------------------
// 【穩健升級】畢卡索《哭泣的女人》幾何線稿視覺生成引擎
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
    alert('✨ 成功生成畢卡索《哭泣的女人》風格高對比幾何線稿！');
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

  if (angleKey === 'front') {
    // 臉型幾何外框
    ctx.beginPath();
    ctx.moveTo(250, 200); ctx.lineTo(550, 200); ctx.lineTo(600, 500); ctx.lineTo(400, 700); ctx.lineTo(200, 500); ctx.closePath();
    ctx.stroke();

    // 雙眼 (幾何杏仁眼框 + 圓形同心眼珠/瞳孔 + 睫毛)
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

    drawCubistEye(ctx, 450, 350, 75, 45, strokeColor);

    ctx.beginPath();
    ctx.moveTo(450, 380); ctx.lineTo(560, 460); ctx.lineTo(470, 480);
    ctx.stroke();

    drawCubistEar(ctx, 280, 380, 50, 90);
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

    ctx.beginPath(); ctx.arc(360, 480, 25, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(440, 480, 25, 0, Math.PI*2); ctx.stroke();

    drawCubistMouth(ctx, 400, 580, 100, 40);
  }

  return canvas;
}

function drawCubistEye(ctx, cx, cy, rx, ry, color) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, ry * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, ry * 0.35, 0, Math.PI * 2);
  ctx.fill();

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

function drawCubistMouth(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w/2, cy);
  ctx.lineTo(cx, cy - h/2);
  ctx.lineTo(cx + w/2, cy);
  ctx.lineTo(cx, cy + h/2);
  ctx.closePath();
  ctx.stroke();

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
