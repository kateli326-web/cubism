// 全域變數
let currentStage = 1;
let angleImages = {
  front: null, right: null, left: null,
  up: null, down: null, threequarter: null
};

// 幾何切割選框 (Stage 2)
let cropCanvas, cropCtx;
let activeAngleKey = 'front';
let cropBox = {
  shape: 'diamond',
  x: 250, y: 150,
  width: 150, height: 110,
  rotation: 0
};

// 切割出來的五官元件庫
let rawFacets = [];      // 原始彩切片
let lineFacets = [];     // Line Drawing 切片

// 步驟 4：三張獨立自畫像畫布 (A, B, C)
let collageCanvas, collageCtx;
let activePortraitIndex = 0;
let portraitsData = [[], [], []]; // 存放自畫像 A, B, C 的元件
let selectedCollageItemIndex = -1;

// 拖曳狀態
let isDraggingBox = false;
let isDraggingCollageItem = false;
let startX = 0, startY = 0;

window.onload = function() {
  cropCanvas = document.getElementById('cropCanvas');
  if (cropCanvas) cropCtx = cropCanvas.getContext('2d');

  collageCanvas = document.getElementById('collageCanvas');
  if (collageCanvas) collageCtx = collageCanvas.getContext('2d');

  // 綁定 Stage 2 拖曳
  if (cropCanvas) {
    cropCanvas.addEventListener('mousedown', handleCropMouseDown);
    cropCanvas.addEventListener('mousemove', handleCropMouseMove);
    window.addEventListener('mouseup', handleCropMouseUp);
  }

  // 綁定 Stage 4 拖曳
  if (collageCanvas) {
    collageCanvas.addEventListener('mousedown', handleCollageMouseDown);
    collageCanvas.addEventListener('mousemove', handleCollageMouseMove);
    window.addEventListener('mouseup', handleCollageMouseUp);
  }
};

// 1. 階段切換
function switchStage(stageNum) {
  currentStage = stageNum;
  document.querySelectorAll('.step-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === stageNum);
  });
  document.querySelectorAll('.stage-panel').forEach((panel, idx) => {
    panel.classList.toggle('active', idx + 1 === stageNum);
  });

  if (stageNum === 2) drawCropCanvas();
  if (stageNum === 3) renderStage3Libraries();
  if (stageNum === 4) {
    renderCollageLibrary();
    drawCollageCanvas();
  }
}

// 2. 步驟 1：載入 6 個角度的照片
function loadAngleImage(e, angleKey) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      angleImages[angleKey] = img;
      const preview = document.getElementById(`preview_${angleKey}`);
      if (preview) {
        preview.src = event.target.result;
        preview.style.display = 'block';
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// 3. 步驟 2：幾何手動切割 (8種幾何圖形)
function changeActiveSourceAngle() {
  activeAngleKey = document.getElementById('angleSelect').value;
  drawCropCanvas();
}

function updateCropShape() {
  cropBox.shape = document.getElementById('shapeSelect').value;
  drawCropCanvas();
}

// 8 種幾何圖形路徑 (相對比例 0~1)
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
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const rad = (i / 16) * Math.PI * 2;
        pts.push([0.5 + 0.5 * Math.cos(rad), 0.5 + 0.5 * Math.sin(rad)]);
      }
      return pts;
  }
}

function drawCropCanvas() {
  if (!cropCtx || !cropCanvas) return;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  const img = angleImages[activeAngleKey];
  if (img) {
    const scale = Math.min(cropCanvas.width / img.width, cropCanvas.height / img.height) * 0.9;
    const renderW = img.width * scale;
    const renderH = img.height * scale;
    const renderX = (cropCanvas.width - renderW) / 2;
    const renderY = (cropCanvas.height - renderH) / 2;

    cropCtx.drawImage(img, renderX, renderY, renderW, renderH);

    // 繪製動態黃色切割選框
    cropCtx.save();
    cropCtx.translate(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
    cropCtx.rotate((cropBox.rotation * Math.PI) / 180);

    const pts = getShapePoints(cropBox.shape);
    const hw = cropBox.width / 2;
    const hh = cropBox.height / 2;

    cropCtx.beginPath();
    cropCtx.moveTo(-hw + pts[0][0] * cropBox.width, -hh + pts[0][1] * cropBox.height);
    for (let i = 1; i < pts.length; i++) {
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
    cropCtx.fillText(`請先在步驟一上傳 [${activeAngleKey}] 角度的照片`, cropCanvas.width / 2, cropCanvas.height / 2);
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
  const img = angleImages[activeAngleKey];
  if (!img) {
    alert('請先在步驟一上傳該角度照片！');
    return;
  }

  const scale = Math.min(cropCanvas.width / img.width, cropCanvas.height / img.height) * 0.9;
  const renderW = img.width * scale;
  const renderH = img.height * scale;
  const renderX = (cropCanvas.width - renderW) / 2;
  const renderY = (cropCanvas.height - renderH) / 2;

  const relX = (cropBox.x - renderX) / scale;
  const relY = (cropBox.y - renderY) / scale;
  const cropW = cropBox.width / scale;
  const cropH = cropBox.height / scale;

  const fCanvas = document.createElement('canvas');
  const fCtx = fCanvas.getContext('2d');
  fCanvas.width = cropW;
  fCanvas.height = cropH;

  const pts = getShapePoints(cropBox.shape);
  fCtx.beginPath();
  fCtx.moveTo(pts[0][0] * cropW, pts[0][1] * cropH);
  for (let i = 1; i < pts.length; i++) {
    fCtx.lineTo(pts[i][0] * cropW, pts[i][1] * cropH);
  }
  fCtx.closePath();

  fCtx.save();
  fCtx.clip();
  fCtx.drawImage(img, relX, relY, cropW, cropH, 0, 0, cropW, cropH);
  fCtx.restore();

  // 畢加索黑框
  fCtx.strokeStyle = '#000000';
  fCtx.lineWidth = Math.max(6, Math.round(cropW * 0.03));
  fCtx.stroke();

  rawFacets.push({
    canvas: fCanvas,
    angle: activeAngleKey,
    width: cropBox.width,
    height: cropBox.height
  });

  alert(`已切下 [${activeAngleKey}] 角度五官！可繼續切割或進入步驟三。`);
}

// 4. 步驟 3：一鍵轉換 Line Drawing (DoG 鋼筆線稿演算法)
function convertAllToLineDrawing() {
  if (rawFacets.length === 0) {
    alert('尚未切割任何五官素材！請先在步驟二手動切割。');
    return;
  }

  lineFacets = [];
  rawFacets.forEach(item => {
    const origCanvas = item.canvas;
    const w = origCanvas.width;
    const h = origCanvas.height;

    const lineCanvas = document.createElement('canvas');
    const lineCtx = lineCanvas.getContext('2d');
    lineCanvas.width = w;
    lineCanvas.height = h;

    const imgData = origCanvas.getContext('2d').getImageData(0, 0, w, h);
    const data = imgData.data;

    // 二值化高對比極簡 Line Drawing 處理
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const v = avg < 130 ? 0 : 255;
        data[i] = v; data[i + 1] = v; data[i + 2] = v;
      }
    }

    lineCtx.putImageData(imgData, 0, 0);

    // 強化粗黑手繪外框
    lineCtx.strokeStyle = '#000000';
    lineCtx.lineWidth = Math.max(8, Math.round(w * 0.04));
    lineCtx.strokeRect(0, 0, w, h);

    lineFacets.push({
      canvas: lineCanvas,
      angle: item.angle,
      width: item.width,
      height: item.height
    });
  });

  renderStage3Libraries();
  alert('✨ 成功一鍵轉換為畢卡索 Line Drawing 鋼筆線稿風格！');
}

function renderStage3Libraries() {
  const rawLib = document.getElementById('rawFacetsLibrary');
  const lineLib = document.getElementById('lineFacetsLibrary');

  if (rawLib) {
    rawLib.innerHTML = rawFacets.length === 0 ? '<span style="color:#888;">尚未切割任何五官</span>' : '';
    rawFacets.forEach(item => {
      const img = document.createElement('img');
      img.src = item.canvas.toDataURL();
      img.className = 'library-item';
      rawLib.appendChild(img);
    });
  }

  if (lineLib) {
    lineLib.innerHTML = lineFacets.length === 0 ? '<span style="color:#888;">尚未轉換 Line Drawing</span>' : '';
    lineFacets.forEach(item => {
      const img = document.createElement('img');
      img.src = item.canvas.toDataURL();
      img.className = 'library-item';
      lineLib.appendChild(img);
    });
  }
}

// 5. 步驟 4：自畫像 A, B, C 拼貼
function switchPortraitTab(index) {
  activePortraitIndex = index;
  selectedCollageItemIndex = -1;
  document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === index);
  });
  drawCollageCanvas();
}

function renderCollageLibrary() {
  const lib = document.getElementById('collageFacetsLibrary');
  if (!lib) return;
  lib.innerHTML = lineFacets.length === 0 ? '<span style="color:#888;">無 Line Drawing 素材</span>' : '';

  lineFacets.forEach((item, idx) => {
    const img = document.createElement('img');
    img.src = item.canvas.toDataURL();
    img.className = 'library-item';
    img.title = `點擊加入 [${item.angle}] 五官`;
    img.onclick = () => addFacetToCollage(idx);
    lib.appendChild(img);
  });
}

function addFacetToCollage(lineFacetIndex) {
  const facet = lineFacets[lineFacetIndex];
  if (!facet) return;

  const newItem = {
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
  if (!collageCtx || !collageCanvas) return;
  collageCtx.clearRect(0, 0, collageCanvas.width, collageCanvas.height);

  const currentItems = portraitsData[activePortraitIndex];
  currentItems.forEach((item, idx) => {
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
  const item = portraitsData[activePortraitIndex][selectedCollageItemIndex];
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
  const link = document.createElement('a');
  link.download = `畢卡索立體派自畫像_${['A','B','C'][activePortraitIndex]}.png`;
  link.href = collageCanvas.toDataURL();
  link.click();
}

// 拖曳事件處理
function handleCropMouseDown(e) {
  const rect = cropCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (mx >= cropBox.x && mx <= cropBox.x + cropBox.width &&
      my >= cropBox.y && my <= cropBox.y + cropBox.height) {
    isDraggingBox = true;
    startX = mx - cropBox.x;
    startY = my - cropBox.y;
  }
}

function handleCropMouseMove(e) {
  if (!isDraggingBox) return;
  const rect = cropCanvas.getBoundingClientRect();
  cropBox.x = e.clientX - rect.left - startX;
  cropBox.y = e.clientY - rect.top - startY;
  drawCropCanvas();
}

function handleCropMouseUp() { isDraggingBox = false; }

function handleCollageMouseDown(e) {
  const rect = collageCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const currentItems = portraitsData[activePortraitIndex];
  selectedCollageItemIndex = -1;

  for (let i = currentItems.length - 1; i >= 0; i--) {
    const item = currentItems[i];
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
  if (!isDraggingCollageItem || selectedCollageItemIndex === -1) return;
  const rect = collageCanvas.getBoundingClientRect();
  const item = portraitsData[activePortraitIndex][selectedCollageItemIndex];
  item.x = e.clientX - rect.left - startX;
  item.y = e.clientY - rect.top - startY;
  drawCollageCanvas();
}

function handleCollageMouseUp() { isDraggingCollageItem = false; }
