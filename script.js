let canvas, ctx;
let elements = [];
let selectedIndex = -1;

// 拖曳狀態變數
let isDragging = false;
let startX = 0;
let startY = 0;

// 初始化（使用 window.onload 保證所有 HTML 元素皆已完全載入）
window.onload = function() {
  canvas = document.getElementById('c');
  if (canvas) {
    ctx = canvas.getContext('2d');
  }

  const fileInput = document.getElementById('imageLoader');
  if (fileInput) {
    fileInput.addEventListener('change', handleImageUpload);
  }

  if (canvas) {
    // 綁定電腦滑鼠拖曳
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 綁定 iPad 觸控拖曳
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }
};

// 1. 照片上傳（修復事件處理）
function handleImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let initWidth = 260;
      let initHeight = (img.height / img.width) * initWidth;

      // 錯開位置，避免照片上傳後完全重疊
      const offset = elements.length * 35;

      const newElement = {
        type: 'image',
        img: img,
        processedImg: null,
        x: 40 + (offset % 180),
        y: 40 + (offset % 180),
        width: initWidth,
        height: initHeight,
        isLineArt: false
      };

      elements.push(newElement);
      selectedIndex = elements.length - 1;
      drawCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// 2. 畫布渲染繪製
function drawCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  elements.forEach((item, index) => {
    ctx.save();

    if (item.type === 'image') {
      const renderImg = (item.isLineArt && item.processedImg) ? item.processedImg : item.img;
      ctx.drawImage(renderImg, item.x, item.y, item.width, item.height);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(item.x, item.y, item.width, item.height);

    } else if (item.type === 'facet') {
      // 繪製切割出來的幾何五官切片
      ctx.drawImage(item.canvas, item.x, item.y, item.width, item.height);

    } else if (item.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.strokeStyle = item.color || '#000000';
      ctx.lineWidth = item.lineWidth || 6;
      ctx.stroke();
    }

    // 選中項目的虛線框提示
    if (index === selectedIndex) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}

// 3. 方案 B：幾何五官切割 (一鍵切割)
function extractGeometricFacets() {
  let targetIndex = selectedIndex;
  if (targetIndex === -1 || elements[targetIndex]?.type !== 'image') {
    for (let i = elements.length - 1; i >= 0; i--) {
      if (elements[i].type === 'image') {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex === -1) {
    alert('請先上傳一張照片！');
    return;
  }

  const baseItem = elements[targetIndex];
  const srcImg = baseItem.processedImg || baseItem.img;
  const w = srcImg.naturalWidth || srcImg.width || 300;
  const h = srcImg.naturalHeight || srcImg.height || 300;

  // 4 個幾何切割框配置（左眼、右眼、鼻子、嘴巴）
  const facetsConfig = [
    { name: '左眼', clipPath: [[0.12, 0.18], [0.46, 0.14], [0.44, 0.42], [0.14, 0.44]], dx: baseItem.x + baseItem.width + 20, dy: baseItem.y },
    { name: '右眼', clipPath: [[0.52, 0.16], [0.88, 0.20], [0.84, 0.45], [0.50, 0.42]], dx: baseItem.x + baseItem.width + 160, dy: baseItem.y },
    { name: '鼻子', clipPath: [[0.36, 0.30], [0.64, 0.30], [0.58, 0.72], [0.34, 0.70]], dx: baseItem.x + baseItem.width + 50, dy: baseItem.y + 120 },
    { name: '嘴巴', clipPath: [[0.18, 0.60], [0.82, 0.58], [0.88, 0.90], [0.12, 0.92]], dx: baseItem.x + baseItem.width + 30, dy: baseItem.y + 260 }
  ];

  facetsConfig.forEach(cfg => {
    const fCanvas = document.createElement('canvas');
    const fCtx = fCanvas.getContext('2d');
    fCanvas.width = w;
    fCanvas.height = h;

    // 幾何多邊形裁剪
    fCtx.beginPath();
    const pts = cfg.clipPath;
    fCtx.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (let i = 1; i < pts.length; i++) {
      fCtx.lineTo(pts[i][0] * w, pts[i][1] * h);
    }
    fCtx.closePath();

    fCtx.save();
    fCtx.clip();
    fCtx.drawImage(srcImg, 0, 0, w, h);
    fCtx.restore();

    // 加粗幾何框線
    fCtx.strokeStyle = '#000000';
    fCtx.lineWidth = Math.max(8, Math.round(w * 0.025));
    fCtx.stroke();

    const renderWidth = Math.min(180, baseItem.width * 0.65);
    const renderHeight = (h / w) * renderWidth;

    elements.push({
      type: 'facet',
      canvas: fCanvas,
      x: Math.min(canvas.width - 150, Math.max(10, cfg.dx)),
      y: Math.min(canvas.height - 150, Math.max(10, cfg.dy)),
      width: renderWidth,
      height: renderHeight
    });
  });

  selectedIndex = elements.length - 1;
  drawCanvas();
}

// 4. 高對比黑白二值化
function applyBlackAndWhite() {
  let targetIndex = selectedIndex;
  if (targetIndex === -1 || elements[targetIndex]?.type !== 'image') {
    for (let i = elements.length - 1; i >= 0; i--) {
      if (elements[i].type === 'image') {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex !== -1 && elements[targetIndex].type === 'image') {
    const item = elements[targetIndex];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const w = item.img.naturalWidth || item.img.width;
    const h = item.img.naturalHeight || item.img.height;
    tempCanvas.width = w;
    tempCanvas.height = h;

    tempCtx.drawImage(item.img, 0, 0, w, h);
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const v = avg < 120 ? 0 : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }

    tempCtx.putImageData(imgData, 0, 0);

    const processedImg = new Image();
    processedImg.onload = function () {
      item.processedImg = processedImg;
      item.isLineArt = true;
      drawCanvas();
    };
    processedImg.src = tempCanvas.toDataURL();
  } else {
    alert('請先上傳照片！');
  }
}

function addCutLine() {
  elements.push({
    type: 'line',
    x1: 100,
    y1: 100,
    x2: 400,
    y2: 500,
    lineWidth: 6,
    color: '#000000',
    width: 300,
    height: 400
  });
  selectedIndex = elements.length - 1;
  drawCanvas();
}

function deleteSelected() {
  if (selectedIndex !== -1) {
    elements.splice(selectedIndex, 1);
    selectedIndex = -1;
    drawCanvas();
  }
}

// ----------------------------------------------------
// 滑動與觸控拖曳移動邏輯 (Drag and Drop)
// ----------------------------------------------------

function handleMouseDown(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  selectedIndex = -1;
  for (let i = elements.length - 1; i >= 0; i--) {
    const item = elements[i];
    const w = item.width || 100;
    const h = item.height || 100;

    if (mouseX >= item.x && mouseX <= item.x + w && mouseY >= item.y && mouseY <= item.y + h) {
      selectedIndex = i;
      isDragging = true;
      startX = mouseX - item.x;
      startY = mouseY - item.y;
      break;
    }
  }
  drawCanvas();
}

function handleMouseMove(e) {
  if (!isDragging || selectedIndex === -1) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const item = elements[selectedIndex];
  item.x = mouseX - startX;
  item.y = mouseY - startY;
  drawCanvas();
}

function handleMouseUp() {
  isDragging = false;
}

function handleTouchStart(e) {
  if (!canvas) return;
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }
}

function handleTouchMove(e) {
  if (!canvas) return;
  if (e.touches.length === 1 && isDragging) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
}

function handleTouchEnd() {
  handleMouseUp();
}
