let currentStage = 1;
let angleImages = {
  front: null, right: null, left: null,
  up: null, down: null, threequarter: null
};

let cropCanvas, cropCtx;
let activeAngleKey = 'front';
let cropBox = {
  shape: 'diamond',
  x: 250, y: 150,
  width: 150, height: 110,
  rotation: 0
};

let rawFacets = [];
let lineFacets = [];

let collageCanvas, collageCtx;
let activePortraitIndex = 0;
let portraitsData = [[], [], []];
let selectedCollageItemIndex = -1;

let isDraggingBox = false;
let isDraggingCollageItem = false;
let startX = 0, startY = 0;

window.onload = function() {
  cropCanvas = document.getElementById('cropCanvas');
  if (cropCanvas) cropCtx = cropCanvas.getContext('2d');

  collageCanvas = document.getElementById('collageCanvas');
  if (collageCanvas) collageCtx = collageCanvas.getContext('2d');

  if (cropCanvas) {
    cropCanvas.addEventListener('mousedown', handleCropMouseDown);
    cropCanvas.addEventListener('mousemove', handleCropMouseMove);
    window.addEventListener('mouseup', handleCropMouseUp);
  }

  if (collageCanvas) {
    collageCanvas.addEventListener('mousedown', handleCollageMouseDown);
    collageCanvas.addEventListener('mousemove', handleCollageMouseMove);
    window.addEventListener('mouseup', handleCollageMouseUp);
  }
};

function switchStage(stageNum) {
  currentStage = stageNum;
  document.querySelectorAll('.step-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === stageNum);
  });
  document.querySelectorAll('.stage-panel').forEach((panel, idx) => {
    panel.classList.toggle('active', idx + 1 === stageNum);
  });

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

function loadAngleImage(e, angleKey) {
  const file = e.target.files && e.target.files[0];
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

function changeActiveSourceAngle() {
  activeAngleKey = document.getElementById('angleSelect').value;
  drawCropCanvas();
}

function updateCropShape() {
  cropBox.shape = document.getElementById('shapeSelect').value;
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
  const previewDiv = document.getElementById('stage2FacetsPreview');
  if (!previewDiv) return;

  if (rawFacets.length === 0) {
    previewDiv.innerHTML = '<span style="color:#888;">按下「✂️ 切割選取區域五官」後，切下的五官會即時顯示在這裡！</span>';
    return;
  }

  previewDiv.innerHTML = '';
  rawFacets.forEach((item, idx) => {
    const container = document.createElement('div');
    container.className = 'library-item-container';

    const img = document.createElement('img');
    img.src = item.canvas.toDataURL();
    img.className = 'library-item';

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-item-btn';
    delBtn.innerHTML = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      rawFacets.splice(idx, 1);
      renderStage2Preview();
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    previewDiv.appendChild(container);
  });
}

// 4. 畢卡索純手繪幾何 Line Drawing 提線演算法 (Clean Picassoid Ink Extractor)
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

    // A. 填充 100% 潔白背景底色 (純白白紙感)
    lineCtx.fillStyle = '#ffffff';
    lineCtx.fillRect(0, 0, w, h);

    const srcCtx = origCanvas.getContext('2d');
    const imgData = srcCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // B. 精準提取瞳孔/深色特徵與邊緣，避免膚色陰影干擾
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = w;
    tempCanvas.height = h;

    const edgeData = tempCtx.createImageData(w, h);
    const ed = edgeData.data;

    // 計算局部暗部特徵 (眼珠、鼻孔、唇線)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 30) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // 只保留真正極深色結構特徵 (眼珠/唇線/鼻孔/黑框)
        if (brightness < 85) {
          ed[i] = 0;
          ed[i + 1] = 0;
          ed[i + 2] = 0;
          ed[i + 3] = 255;
        }
      }
    }
    tempCtx.putImageData(edgeData, 0, 0);

    // C. 繪製精細鋼筆輪廓線
    lineCtx.drawImage(tempCanvas, 0, 0);

    // D. 根據幾何形狀重構畢卡索手繪幾何風格內部結構線條
    lineCtx.strokeStyle = '#000000';
    lineCtx.lineWidth = Math.max(5, Math.round(w * 0.028));
    lineCtx.lineCap = 'round';
    lineCtx.lineJoin = 'round';

    const pts = getShapePoints(item.shape || 'diamond');

    // 繪製幾何分割交叉線條（如《
