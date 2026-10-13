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

  // 支援畫布點擊選擇與拖拽
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
      // 計算適合畫布的比例
      let initWidth = 250;
      let initHeight = (img.height / img.width) * initWidth;

      const newElement = {
        type: 'image',
        img: img,
        x: 50 + elements.length * 20,
        y: 50 + elements.length * 20,
        width: initWidth,
        height: initHeight,
        isGrayscale: false
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
      // 繪製照片
      if (item.isGrayscale) {
        // 高對比黑白處理
        ctx.filter = 'grayscale(100%) contrast(200%)';
      } else {
        ctx.filter = 'none';
      }
      ctx.drawImage(item.img, item.x, item.y, item.width, item.height);
      ctx.filter = 'none'; // 重置濾鏡

      // 畢加索風格：自動加上粗黑邊框
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

// 2. 一鍵轉為高對比黑白線稿
function applyBlackAndWhite() {
  if (selectedIndex !== -1 && elements[selectedIndex].type === 'image') {
    elements[selectedIndex].isGrayscale = true;
    drawCanvas();
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
