// 全域變數
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

var isDraggingBox = false;
var isDraggingCollageItem = false;
var startX = 0, startY = 0;

// 【最核心】直連上傳函數：由 HTML input 直接傳入，不依賴任何頁面監聽器
function uploadImage(inputElement, key) {
  if (!inputElement || !inputElement.files || !inputElement.files[0]) return;
  var file = inputElement.files[0];

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
  initCanvases();
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
  initCanvases();
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
}

function renderStage2Preview() {
  var previewDiv = document.getElementById('stage2FacetsPreview');
  if (!previewDiv) return;

  if (rawFacets.length === 0) {
    previewDiv.innerHTML = '<span style="color:#888;">按下「✂️ 切割選取區域五官」後，切下的五官會即時顯示在這裡！</span>';
    return;
  }

  previewDiv.innerHTML = '';
  rawFacets.forEach(function(item, idx) {
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
      rawFacets.splice(idx, 1);
      renderStage2Preview();
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    previewDiv.appendChild(container);
  });
}

function convertAllToLineDrawing() {
  if (rawFacets.length === 0) {
    alert('尚未切割任何五官素材！請先在步驟二手動切割。');
    return;
  }

  lineFacets = [];
  rawFacets.forEach(function(item) {
    var origCanvas = item.canvas;
    var w = origCanvas.width;
    var h = origCanvas.height;

    var lineCanvas = document.createElement('canvas');
    var lineCtx = lineCanvas.getContext('2d');
    lineCanvas.width = w;
    lineCanvas.height = h;

    lineCtx.fillStyle = '#ffffff';
    lineCtx.fillRect(0, 0, w, h);

    var srcCtx = origCanvas.getContext('2d');
    var imgData = srcCtx.getImageData(0, 0, w, h);
    var data = imgData.data;

    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = w;
    tempCanvas.height = h;

    var edgeData = tempCtx.createImageData(w, h);
    var ed = edgeData.data;

    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 30) {
        var brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (brightness < 90) {
          ed[i] = 0; ed[i + 1] = 0; ed[i + 2] = 0; ed[i + 3] = 255;
        }
      }
    }
    tempCtx.putImageData(edgeData, 0, 0);
    lineCtx.drawImage(tempCanvas, 0, 0);

    var pts = getShapePoints(item.shape || 'diamond');
    lineCtx.beginPath();
    lineCtx.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (var j = 1; j < pts.length; j++) {
      lineCtx.lineTo(pts[j][0] * w, pts[j][1] * h);
    }
    lineCtx.closePath();

    lineCtx.strokeStyle = '#000000';
    lineCtx.lineWidth = Math.max(8, Math.round(w * 0.045));
    lineCtx.stroke();

    lineFacets.push({
      canvas: lineCanvas,
      angle: item.angle,
      width: item.width,
      height: item.height
    });
  });

  renderStage3Libraries();
  alert('✨ 成功轉換為純白底高清畢卡索 Line Drawing 鋼筆線稿！');
}

function renderStage3Libraries() {
  var rawLib = document.getElementById('rawFacetsLibrary');
  var lineLib = document.getElementById('lineFacetsLibrary');

  if (rawLib) {
    rawLib.innerHTML = rawFacets.length === 0 ? '<span style="color:#888;">尚未切割任何五官</span>' : '';
    rawFacets.forEach(function(item) {
      var img = document.createElement('img');
      img.src = item.canvas.toDataURL();
      img.className = 'library-item';
      rawLib.appendChild(img);
    });
  }

  if (lineLib) {
    lineLib.innerHTML = lineFacets.length === 0 ? '<span style="color:#888;">尚未轉換 Line Drawing</span>' : '';
    lineFacets.forEach(function(item) {
      var img = document.createElement('img');
      img.src = item.canvas.toDataURL();
      img.className = 'library-item';
      lineLib.appendChild(img);
    });
  }
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
  lib.innerHTML = lineFacets.length === 0 ? '<span style="color:#888;">無 Line Drawing 素材</span>' : '';

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

function handleCropMouseUp() {
  isDraggingBox = false;
}

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

function handleCollageMouseUp() {
  isDraggingCollageItem = false;
}
