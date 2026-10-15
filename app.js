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

// 1. 原生極速圖片上傳（絕對不崩潰）
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
// 【步驟二：原生 Canvas 提煉真實寫生 Line Drawing 線稿】
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

// 超穩健原生 Canvas 灰階高對比線稿提煉技術
function processPhotoToNaturalRealLineArt(sourceImg, colorMode) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var maxDim = 800;
  var scale = Math.min(1, maxDim / Math.max(sourceImg.width, sourceImg.height));
  var w = Math.round(sourceImg.width * scale);
  var h = Math.round(sourceImg.height * scale);
  
  canvas.width = w;
  canvas.height = h;

  // 1. 繪製原圖
  ctx.drawImage(sourceImg, 0, 0, w, h);
  
  // 2. 套用高對比素描濾鏡效果 (模擬真實寫生線稿)
  ctx.filter = 'grayscale(100%) contrast(300%) brightness(120%)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  // 3. 色彩替換 (若選擇藍/綠/紅)
  if (colorMode !== 'black') {
    var imgData = ctx.getImageData(0, 0, w, h);
    var d = imgData.data;
    var rgb = [0, 90, 200]; // 經典藍
    if (colorMode === 'green') rgb = [0, 140, 60];
    if (colorMode === 'red') rgb = [210, 20, 40];

    for (var i = 0; i < d.length; i += 4) {
      if (d[i] < 180) { // 深色線條替換為選擇的顏色
        d[i] = rgb[0];
        d[i+1] = rgb[1];
        d[i+2] = rgb[2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
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

// -------------------------------------------------------------
// 【步驟四：五官角度分類與畢卡索幾何參考圖即時顯示】
// -------------------------------------------------------------
var angleNames = {
  front: '1. 正面五官',
  right: '2. 右側面五官',
  left: '3. 左側面五官',
  up: '4. 仰視五官',
  down: '5. 俯視五官',
  threequarter: '6. 三七面五官'
};

function renderClassifiedFacets() {
  var classifiedContainer = document.getElementById('classifiedFacetsContainer');
  if (!classifiedContainer) return;
  classifiedContainer.innerHTML = '';

  var angles = ['front', 'right', 'left', 'up', 'down', 'threequarter'];

  angles.forEach(function(angleKey) {
    var groupDiv = document.createElement('div');
    groupDiv.className = 'angle-group-card';
    groupDiv.onclick = function() { updatePicassoReference(angleKey); };

    var title = document.createElement('h5');
    title.innerText = angleNames[angleKey];
    groupDiv.appendChild(title);

    var itemsDiv = document.createElement('div');
    itemsDiv.className = 'angle-group-items';

    var facetsOfAngle = lineFacets.filter(function(f) { return f.angle === angleKey; });

    if (facetsOfAngle.length === 0) {
      itemsDiv.innerHTML = '<span class="empty-tip">未切割</span>';
    } else {
      facetsOfAngle.forEach(function(facet) {
        var img = document.createElement('img');
        img.src = facet.canvas.toDataURL();
        img.className = 'library-item';
        img.onclick = function(e) {
          e.stopPropagation();
          addFacetToCollageObj(facet);
          updatePicassoReference(angleKey);
        };
        itemsDiv.appendChild(img);
      });
    }

    groupDiv.appendChild(itemsDiv);
    classifiedContainer.appendChild(groupDiv);
  });
}

function updatePicassoReference(angleKey) {
  var refCanvas = document.getElementById('picassoRefCanvas');
  var titleElem = document.getElementById('picassoRefTitle');
  if (!refCanvas) return;
  var ctx = refCanvas.getContext('2d');
  
  if (titleElem) {
    titleElem.innerText = '🎨 畢卡索《哭泣的女人》繪畫參考圖（' + angleNames[angleKey] + '）';
  }

  ctx.clearRect(0, 0, refCanvas.width, refCanvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, refCanvas.width, refCanvas.height);

  ctx.strokeStyle = '#005ac8';
  ctx.fillStyle = '#005ac8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (angleKey === 'front') {
    ctx.beginPath(); ctx.moveTo(80, 50); ctx.lineTo(220, 50); ctx.lineTo(240, 180); ctx.lineTo(150, 260); ctx.lineTo(60, 180); ctx.closePath(); ctx.stroke();
    drawCubistEye(ctx, 105, 120, 30, 18);
    drawCubistEye(ctx, 195, 120, 30, 18);
    ctx.beginPath(); ctx.moveTo(150, 90); ctx.lineTo(135, 170); ctx.lineTo(165, 170); ctx.closePath(); ctx.stroke();
    drawCubistMouth(ctx, 150, 215, 60, 25);

  } else if (angleKey === 'right' || angleKey === 'threequarter') {
    ctx.beginPath(); ctx.moveTo(90, 40); ctx.lineTo(200, 40); ctx.lineTo(220, 130); ctx.lineTo(180, 180); ctx.lineTo(150, 250); ctx.lineTo(90, 200); ctx.closePath(); ctx.stroke();
    drawCubistEye(ctx, 175, 125, 35, 20);
    ctx.beginPath(); ctx.moveTo(175, 140); ctx.lineTo(225, 170); ctx.lineTo(185, 180); ctx.stroke();
    drawCubistEar(ctx, 80, 130, 25, 45);
    drawCubistMouth(ctx, 175, 215, 45, 22);

  } else if (angleKey === 'left') {
    ctx.beginPath(); ctx.moveTo(210, 40); ctx.lineTo(100, 40); ctx.lineTo(80, 130); ctx.lineTo(120, 180); ctx.lineTo(150, 250); ctx.lineTo(210, 200); ctx.closePath(); ctx.stroke();
    drawCubistEye(ctx, 125, 125, 35, 20);
    ctx.beginPath(); ctx.moveTo(125, 140); ctx.lineTo(75, 170); ctx.lineTo(115, 180); ctx.stroke();
    drawCubistEar(ctx, 220, 130, 25, 4
