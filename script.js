let canvas, ctx;
let elements = []; // 儲存所有上傳的照片與幾何線條
let selectedIndex = -1; // 當前選中的元件索引

window.addEventListener('DOMContentLoaded', function () {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');

  // 監聽圖片選取
  const fileInput = document.getElementById('imageLoader');
  if (fileInput) {
    fileInput.addEventListener('change', handleImageUpload);
  }

  // 支援畫布點擊選擇
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
});

// 1. 處理圖片上傳並加載至畫布
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let initWidth = 260;
      let initHeight = (img.height / img.width) * initWidth;

      const newElement = {
        type: 'image',
        img: img,
        processedImg: null, // 儲存轉換後的線稿 Image
        x: 50 + elements.length * 20,
        y: 50 + elements.length * 20,
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
  e.target.value = ''; // 重置 input
}

// 繪製畫布上的所有內容
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  elements.forEach((item, index) => {
    ctx.save();

    if (item.type === 'image') {
      // 繪製照片或線稿
      const renderImg = (item.isLineArt && item.processedImg) ? item.processedImg : item.img;
      ctx.drawImage(renderImg, item.x, item.y, item.width, item.height);

      // 畢加索風格：粗黑邊框
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(item.x, item.y, item.width, item.height);

      // 若被選中，加上藍色外框提示
      if (index === selectedIndex) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
      }
    } else if (item.type === 'line') {
      // 繪製幾何切割線
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.strokeStyle = item.color || '#000000';
      ctx.lineWidth = item.lineWidth || 5;
      ctx.stroke();

      if (index === selectedIndex) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.min(item.x1, item.x2) - 5, Math.min(item.y1, item.y2) - 5, Math.abs(item.x2 - item.x1) + 10, Math.abs(item.y2 - item.y1) + 10);
      }
    }

    ctx.restore();
  });
}

// 2. 一鍵轉為真正的「白底黑線稿 (Line Drawing)」
function applyBlackAndWhite() {
  if (selectedIndex !== -1 && elements[selectedIndex].type === 'image') {
    const item = elements[selectedIndex];
    
    // 建立臨時 Offscreen Canvas 進行像素處理
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = item.img.width;
    tempCanvas.height = item.img.height;

    tempCtx.drawImage(item.img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    const width = tempCanvas.width;
    const height = tempCanvas.height;

    // 先轉灰階
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 索貝爾 (Sobel) 邊緣檢測演算法提取五官線條
    const output = tempCtx.createImageData(width, height);
    const outData = output.data;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // X/Y 軸梯度
        const gx =
          -1 * gray[(y - 1) * width + (x - 1)] + 1 * gray[(y - 1) * width + (x + 1)] +
          -2 * gray[y * width + (x - 1)]       + 2 * gray[y * width + (x + 1)] +
          -1 * gray[(y + 1) * width + (x - 1)] + 1 * gray[(y + 1) * width + (x + 1)];

        const gy =
          -1 * gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - 1 * gray[(y - 1) * width + (x + 1)] +
           1 * gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + 1 * gray[(y + 1) * width + (x + 1)];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        // 門檻設定：提取線條並轉為白底黑線
        const pixelIdx = idx * 4;
        const isEdge = magnitude > 35; // 邊緣敏感度

        const colorVal = isEdge ? 0 : 255; // 邊緣為純黑(0)，背景為純白(255)
        outData[pixelIdx] = colorVal;     // R
        outData[pixelIdx + 1] = colorVal; // G
        outData[pixelIdx + 2] = colorVal; // B
        outData[pixelIdx + 3] = 255;      // Alpha
      }
    }

    tempCtx.putImageData(output, 0, 0);

    // 將處理後的線稿保存為新 Image 物件
    const processedImg = new Image();
    processedImg.onload = function () {
      item.processedImg = processedImg;
      item.isLineArt = true;
      drawCanvas();
    };
    processedImg.src = tempCanvas.toDataURL();
  } else {
    alert('請先點選畫布上的照片！');
  }
}

// 3. 新增幾何切割線
function addCutLine() {
  const newLine = {
    type: 'line',
    x1: 100,
    y1: 100,
    x2: 400,
    y2: 500,
    lineWidth: 6,
    color: '#000000'
  };
  elements.push(newLine);
  selectedIndex = elements.length - 1;
  drawCanvas();
}

// 4. 刪除選取元件
function deleteSelected() {
  if (selectedIndex !== -1) {
    elements.splice(selectedIndex, 1);
    selectedIndex = -1;
    drawCanvas();
  }
}

// 點擊選擇邏輯
function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let found = false;
  for (let i = elements.length - 1; i >= 0; i--) {
    const item = elements[i];
    if (item.type === 'image') {
      if (mouseX >= item.x && mouseX <= item.x + item.width && mouseY >= item.y && mouseY <= item.y + item.height) {
        selectedIndex = i;
        found = true;
        break;
      }
    }
  }
  if (!found) selectedIndex = -1;
  drawCanvas();
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    for (let i = elements.length - 1; i >= 0; i--) {
      const item = elements[i];
      if (item.type === 'image' && mouseX >= item.x && mouseX <= item.x + item.width && mouseY >= item.y && mouseY <= item.y + item.height) {
        selectedIndex = i;
        break;
      }
    }
    drawCanvas();
  }
}
