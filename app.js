let canvas, ctx;
let elements = [];
let selectedIndex = -1;

// 拖曳狀態變數
let isDragging = false;
let startX = 0;
let startY = 0;

// 幾何切割選框狀態
let cropBox = {
  shape: 'diamond', // diamond, triangle, trapezoid, polygon
  x: 200,
  y: 200,
  width: 140,
  height: 100
};

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
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }
};

// 1. 上傳照片
function handleImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let initWidth = 320;
      let initHeight = (img.height / img.width) * initWidth;

      const offset = elements.length * 30;

      const newElement = {
        type: 'image',
        img: img,
        processedImg: null,
        x: 50 + (offset % 150),
        y: 50 + (offset % 150),
        width: initWidth,
        height: initHeight,
        isLineArt: false
      };

      elements.push(newElement);
      selectedIndex = elements.length - 1;

      // 自動將黃色切割框擺在照片中央
      cropBox.x = newElement.x + newElement.width / 2 - cropBox.width / 2;
      cropBox.y = newElement.y + newElement.height / 2 - cropBox.height / 2;

      drawCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// 切換切割幾何形狀
function updateCropShape() {
  const select = document.getElementById('shapeSelect');
  if (select) {
    cropBox.shape = select.value;
    drawCanvas();
  }
}

// 獲取幾何路徑點 (相對 0~1 比例)
function getShapePoints(shape) {
  if (shape === 'diamond') {
    return [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
  } else if (shape === 'triangle') {
    return [[0.5, 0], [1, 1], [0, 1]];
  } else if (shape === 'trapezoid') {
    return [[0.2, 0], [0.8, 0], [1, 1], [0, 1]];
  } else if (shape === 'polygon') {
    return [[0.3, 0], [0.85, 0.15], [1, 0.85], [0.5, 1], [0, 0.6]];
  }
  return [[0, 0], [1, 0], [1, 1], [0, 1]];
}

// 2. 主畫布渲染
function drawCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // A. 繪製所有圖層 (照片、切片、線條)
  elements.forEach((item, index) => {
    ctx.save();

    if (item.type === 'image') {
      const renderImg = (item.isLineArt && item.processedImg) ? item.processedImg : item.img;
      ctx.drawImage(renderImg, item.x, item.y, item.width, item.height);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(item.x, item.y, item.width, item.height);

    } else if (item.type === 'facet') {
      ctx.drawImage(item.canvas, item.x, item.y, item.width, item.height);

    } else if (item.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.strokeStyle = item.color || '#000000';
      ctx.lineWidth = item.lineWidth || 6;
      ctx.stroke();
    }

    if (index === selectedIndex) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
      ctx.setLineDash([]);
    }

    ctx.restore();
  });

  // B. 繪製可動態移動的「幾何切割選擇框 Overlay」
  const hasImage = elements.some(el => el.type === 'image');
  if (hasImage) {
    ctx.save();
    ctx.strokeStyle = '#ffc107'; // 黃色提醒外框
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);

    const pts = getShapePoints(cropBox.shape);
    ctx.beginPath();
    ctx.moveTo(cropBox.x + pts[0][0] * cropBox.width, cropBox.y + pts[0][1] * cropBox.height);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(cropBox.x + pts[i][0] * cropBox.width, cropBox.y + pts[i][1] * cropBox.height);
    }
    ctx.closePath();
    ctx.stroke();

    // 填充半透明黃色覆蓋區
    ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
    ctx.fill();
    ctx.restore();
  }
}

// 3. 核心：手動切割當前幾何選區內的五官
function cutCurrentFacet() {
  let targetImage = null;
  for (let i = elements.length - 1; i >= 0; i--) {
    if (elements[i].type === 'image') {
      targetImage = elements[i];
      break;
    }
  }

  if (!targetImage) {
    alert('請先上傳一張照片！');
    return;
  }

  const srcImg = targetImage.processedImg || targetImage.img;
  const w = srcImg.naturalWidth || srcImg.width;
  const h = srcImg.naturalHeight || srcImg.height;

  const scaleX = w / targetImage.width;
  const scaleY = h / targetImage.height;

  const relX = (cropBox.x - targetImage.x) * scaleX;
  const relY = (cropBox.y - targetImage.y) * scaleY;
  const cropW = cropBox.width * scaleX;
  const cropH = cropBox.height * scaleY;

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
  fCtx.drawImage(srcImg, relX, relY, cropW, cropH, 0, 0, cropW, cropH);
  fCtx.restore();

  // 畢加索風格粗黑邊框
  fCtx.strokeStyle = '#000000';
  fCtx.lineWidth = Math.max(8, Math.round(cropW * 0.04));
  fCtx.stroke();

  elements.push({
    type: 'facet',
    canvas: fCanvas,
    x: targetImage.x + targetImage.width + 30,
    y: Math.min(canvas.height - 150, Math.max(20, cropBox.y)),
    width: cropBox.width,
    height: cropBox.height
  });

  selectedIndex = elements.length - 1;
  drawCanvas();
}

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
    x1: 100, y1: 100, x2: 400, y2: 500, lineWidth: 6, color: '#000000', width: 300, height: 400
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

// 拖曳邏輯
let isDraggingCropBox = false;

function handleMouseDown(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 1. 優先判斷是否點中「黃色幾何切割框」
  if (mouseX >= cropBox.x && mouseX <= cropBox.x + cropBox.width &&
      mouseY >= cropBox.y && mouseY <= cropBox.y + cropBox.height) {
    isDraggingCropBox = true;
    startX = mouseX - cropBox.x;
    startY = mouseY - cropBox.y;
    return;
  }

  // 2. 判斷是否點中畫布上的圖片或切片
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
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isDraggingCropBox) {
    cropBox.x = mouseX - startX;
    cropBox.y = mouseY - startY;
    drawCanvas();
    return;
  }

  if (isDragging && selectedIndex !== -1) {
    const item = elements[selectedIndex];
    item.x = mouseX - startX;
    item.y = mouseY - startY;
    drawCanvas();
  }
}

function handleMouseUp() {
  isDragging = false;
  isDraggingCropBox = false;
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
  if (e.touches.length === 1) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
}

function handleTouchEnd() {
  handleMouseUp();
}
