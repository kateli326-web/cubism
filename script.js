let canvas, ctx;
let elements = [];
let selectedIndex = -1;

// 拖曳狀態控制
let isDragging = false;
let startX = 0;
let startY = 0;

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
    // 綁定滑鼠事件 (電腦端)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    // 綁定觸控事件 (iPad / 行動裝置)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
  }
};

// 1. 照片上傳與避開重疊放位
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let initWidth = 260;
      let initHeight = (img.height / img.width) * initWidth;

      // 錯開放置，避免圖片重疊在一起
      const offset = elements.length * 30;

      const newElement = {
        type: 'image',
        img: img,
        processedImg: null,
        x: 40 + (offset % 200),
        y: 40 + (offset % 200),
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

// 2. 主畫布渲染繪製
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
      // 繪製幾何切割出的五官切片
      ctx.drawImage(item.canvas, item.x, item.y, item.width, item.height);

    } else if (item.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.strokeStyle = item.color || '#000000';
      ctx.lineWidth = item.lineWidth || 6;
      ctx.stroke();
    }

    // 被選中的元素外加藍色邊框提示
    if (index === selectedIndex) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}

// 3. 方案 B：切割幾何五官切片
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
  const w = srcImg.naturalWidth || srcImg.width;
  const h = srcImg.naturalHeight || srcImg.height;

  // 定義 4 個幾何切割框的位置比例 (左眼, 右眼, 鼻子, 嘴巴)
  const facetsConfig = [
    {
      name: 'left_eye',
      clipPath: [[0.12, 0.18], [0.46, 0.14], [0.44, 0.42], [0.14, 0.44]],
      offsetX: baseItem.x + baseItem.width + 20, offsetY: baseItem.y
    },
    {
      name: 'right_eye',
      clipPath: [[0.52, 0.16], [0.88, 0.20], [0.84, 0.45], [0.50, 0.42]],
      offsetX: baseItem.x + baseItem.width + 160, offsetY: baseItem.y
    },
    {
      name: 'nose',
      clipPath: [[0.36, 0.32], [0.64, 0.32], [0.58, 0.72], [0.34, 0.70]],
      offsetX: baseItem.x + baseItem.width + 50, offsetY: baseItem.y + 120
    },
    {
      name: 'mouth',
      clipPath: [[0.18, 0.60], [0.82, 0.58], [0.88, 0.90], [0.12, 0.92]],
      offsetX: baseItem.x + baseItem.width + 30, offsetY: baseItem.y + 260
    }
  ];

  facetsConfig.forEach(cfg => {
    const fCanvas = document.createElement('canvas');
    const fCtx = fCanvas.getContext('2d');
    fCanvas.width = w;
    fCanvas.height = h;

    // 建立多邊形切割路徑
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

    // 加上畢加索風格粗黑外框
    fCtx.strokeStyle = '#000000';
    fCtx.lineWidth = Math.max(8, Math.round(w * 0.025));
    fCtx.stroke();

    const renderWidth = Math.min(180, baseItem.width * 0.6);
    const renderHeight = (h / w) * renderWidth;

    elements.push({
      type: 'facet',
      canvas: fCanvas,
      x: Math.min(canvas.width - 150, cfg.offsetX),
      y: Math.min(canvas.height - 150, cfg.offsetY),
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
      if (elements
