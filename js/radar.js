/**
 * 雷达地图应用程序
 * 这是一个用于显示和追踪玩家位置的实时雷达地图系统
 * 支持触摸和鼠标操作，包括缩放、平移和玩家选择等功能
 */

/**
 * 全局变量声明
 * 这些变量控制着地图的显示状态和交互行为
 */
let canvas,     // Canvas元素，用于绘制地图和玩家
    ctx,        // Canvas 2D上下文，提供绘图API
    img,        // 地图背景图片对象
    scale = 1,  // 地图缩放比例，默认为1
    offsetX = 0,  // 地图X轴偏移量，用于平移
    offsetY = 0,  // 地图Y轴偏移量，用于平移
    isDragging = false,  // 是否正在拖动地图的标志
    trackingMode = "none",  // 玩家追踪模式：none-不追踪，track-追踪
    players = [],  // 玩家数据数组，存储所有玩家信息
    selectedPlayerName = null,  // 当前选中的玩家名称
    selectedPlayerTeam = null,  // 当前选中玩家的队伍ID
    teamColors = {},  // 队伍颜色映射表，为每个队伍分配唯一颜色
    lastTouchDistance = 0,  // 多点触控时的上次触点距离，用于计算缩放
    showHealth = true,    // 是否显示玩家血量
    showName = true,      // 是否显示玩家名称
    showHelmet = true,    // 是否显示玩家头盔信息
    showArmor = true,     // 是否显示玩家护甲信息
    showWeapon = true,    // 是否显示玩家武器信息
    showDirection = true, // 是否显示玩家朝向
    ip = "",    // 连接的服务器IP地址
    port = "";  // 连接的服务器端口

/**
 * 颜色常量定义
 * 用于显示不同等级装备和高亮选中玩家
 */
const brightGreen = "#00FF00",  // 高亮绿色，用于标记选中的玩家
    colorMap = {  // 装备等级对应的颜色映射
        "none": "transparent",   // 无装备
        "white": "#FFF",        // 白色装备
        "blue": "#1E90FF",      // 蓝色装备
        "purple": "#8A2BE2",    // 紫色装备
        "gold": "#FFD700",      // 金色装备
        "red": "#DC143C"        // 红色装备
    };

/**
 * 从localStorage加载设置
 */
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem("radarSettings"));
    if (settings) {
        showHealth = settings.showHealth;
        showName = settings.showName;
        showHelmet = settings.showHelmet;
        showArmor = settings.showArmor;
        showWeapon = settings.showWeapon;
        showDirection = settings.showDirection;
        trackingMode = settings.trackingMode ? "track" : "none";
        ip = settings.ip || "";
        port = settings.port || "";
    }
}

/**
 * 保存设置到localStorage
 */
function saveSettings() {
    const settings = {
        "showHealth": showHealth,
        "showName": showName,
        "showHelmet": showHelmet,
        "showArmor": showArmor,
        "showWeapon": showWeapon,
        "showDirection": showDirection,
        "trackingMode": trackingMode !== "none",
        "ip": ip,
        "port": port
    };
    localStorage.setItem("radarSettings", JSON.stringify(settings));
}

/**
 * 为新队伍生成颜色
 * @param {Array} existingColors 现有的颜色列表
 * @returns {string} 新生成的颜色
 */
function generateNewTeamColor(existingColors) {
    let maxDifference = 0,
        bestColor = "";
    
    // 尝试10次生成最佳颜色
    for (let i = 0; i < 10; i++) {
        const hue = Math.floor(Math.random() * 360);
        // 避免使用绿色色调(70-160)
        if (hue >= 70 && hue <= 160) continue;
        
        const newColor = `hsl(${hue}, 70%, 50%)`;
        let minDifference = 360;
        
        // 计算与现有颜色的最小差异
        existingColors.forEach(color => {
            const hueDiff = getHueDifference(color, newColor);
            if (hueDiff < minDifference) minDifference = hueDiff;
        });
        
        // 更新最佳颜色
        if (minDifference > maxDifference) {
            maxDifference = minDifference;
            bestColor = newColor;
        }
    }
    return bestColor;
}

/**
 * 计算两个颜色的色调差异
 * @param {string} color1 颜色1
 * @param {string} color2 颜色2
 * @returns {number} 色调差异值
 */
function getHueDifference(color1, color2) {
  const hue1 = parseInt(color1.match(/hsl\((\d+)/)[1]),
    hue2 = parseInt(color2.match(/hsl\((\d+)/)[1]),
    diff = Math.abs(hue1 - hue2);
  return Math.min(diff, 360 - diff);
}

/**
 * 创建雷达地图页面
 */
function createRadarPage() {
  loadSettings(); // 加载设置
  canvas = document.createElement("canvas"); // 创建canvas元素
  document.body.appendChild(canvas); // 将canvas添加到页面
  ctx = canvas.getContext("2d"); // 获取2D上下文
  img = new Image(); // 创建图片对象
  img.src = "db.jpg"; // 设置图片源
  img.onload = () => {
    adjustImageToFit(); // 调整图片适应屏幕
    drawMap(); // 绘制地图
  };
  canvas.addEventListener("mousedown", startDragging); // 鼠标按下事件
  canvas.addEventListener("mousemove", duringDragging); // 鼠标移动事件
  canvas.addEventListener("mouseup", stopDragging); // 鼠标释放事件
  canvas.addEventListener("wheel", handleZoom); // 鼠标滚轮事件
  canvas.addEventListener("click", handlePlayerClick); // 鼠标点击事件
  canvas.addEventListener("touchstart", handleTouchStart, {
    "passive": false
  }); // 触摸开始事件
  canvas.addEventListener("touchmove", handleTouchMove, {
    "passive": false
  }); // 触摸移动事件
  canvas.addEventListener("touchend", handleTouchEnd, {
    "passive": false
  }); // 触摸结束事件
  window.addEventListener("resize", resizeCanvas); // 窗口调整大小事件
  createControlPanel(); // 创建控制面板
}

/**
 * 调整图片适应屏幕
 */
function adjustImageToFit() {
  const aspectRatio = img.width / img.height,
    windowAspectRatio = window.innerWidth / window.innerHeight;
  scale = aspectRatio > windowAspectRatio ? window.innerWidth / img.width : window.innerHeight / img.height;
  offsetX = (window.innerWidth - img.width * scale) / 2;
  offsetY = (window.innerHeight - img.height * scale) / 2;
  resizeCanvas();
}

/**
 * 处理触摸开始事件
 * @param {TouchEvent} event 触摸事件对象
 */
function handleTouchStart(event) {
  event.preventDefault();
  if (event.touches.length === 1) {
    {
      const touch = event.touches[0];
      dragStart = {
        "x": touch.clientX - offsetX,
        "y": touch.clientY - offsetY
      };
      isDragging = true;
    }
  } else event.touches.length === 2 && (lastTouchDistance = getTouchDistance(event.touches));
}

/**
 * 处理触摸移动事件
 * @param {TouchEvent} event 触摸事件对象
 */
function handleTouchMove(event) {
  event.preventDefault();
  if (isDragging && event.touches.length === 1) {
    const touch = event.touches[0];
    offsetX = touch.clientX - dragStart.x;
    offsetY = touch.clientY - dragStart.y;
    drawMap();
  } else {
    if (event.touches.length === 2) {
      const currentDistance = getTouchDistance(event.touches),
        scale_factor = currentDistance / lastTouchDistance;
      lastTouchDistance = currentDistance;
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2,
        centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      scale *= scale_factor;
      scale = Math.max(0.1, scale);
      offsetX -= (centerX - offsetX) * (scale_factor - 1);
      offsetY -= (centerY - offsetY) * (scale_factor - 1);
      drawMap();
    }
  }
}

/**
 * 处理触摸结束事件
 */
function handleTouchEnd() {
  isDragging = false;
  lastTouchDistance = 0;
}

/**
 * 获取触摸距离
 * @param {TouchList} touches 触摸点列表
 * @returns {number} 触摸距离
 */
function getTouchDistance(touches) {
  const deltaX = touches[0].clientX - touches[1].clientX,
    deltaY = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/**
 * 开始拖动
 * @param {MouseEvent} event 鼠标事件对象
 */
function startDragging(event) {
  dragStart = {
    "x": event.clientX - offsetX,
    "y": event.clientY - offsetY
  };
  isDragging = true;
}

/**
 * 处理拖动事件
 * @param {MouseEvent} event 鼠标事件对象
 */
function duringDragging(event) {
  isDragging && (offsetX = event.clientX - dragStart.x, offsetY = event.clientY - dragStart.y, drawMap());
}

/**
 * 停止拖动
 */
function stopDragging() {
  isDragging = false;
}

/**
 * 处理缩放事件
 * @param {WheelEvent} event 鼠标滚轮事件对象
 */
function handleZoom(event) {
  event.preventDefault();
  const zoomStep = 0.1,
    oldScale = scale;
  scale += event.deltaY < 0 ? zoomStep : -zoomStep;
  scale = Math.max(0.1, scale);
  const mouseX = event.clientX,
    mouseY = event.clientY;
  offsetX -= (mouseX - offsetX) * (scale / oldScale - 1);
  offsetY -= (mouseY - offsetY) * (scale / oldScale - 1);
  drawMap();
}

/**
 * 调整画布大小
 */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawMap();
}

/**
 * 绘制地图
 */
function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  drawPlayers();
  if (trackingMode !== "none" && selectedPlayerName) {
    const selectedPlayer = players.find(player => player.name === selectedPlayerName);
    if (selectedPlayer) centerOnPlayer(selectedPlayer);
  }
}

/**
 * 绘制玩家
 */
function drawPlayers() {
  players.forEach(player => {
    {
      const playerX = player.x * scale + offsetX,
        playerY = player.y * scale + offsetY,
        radius = 15 * scale;
      if (!teamColors[player.teamId]) {
        const existingColors = Object.values(teamColors);
        teamColors[player.teamId] = generateNewTeamColor(existingColors);
      }
      let teamColor = teamColors[player.teamId];
      if (selectedPlayerName && (player.name === selectedPlayerName || player.teamId === selectedPlayerTeam)) {
        teamColor = brightGreen;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(playerX, playerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.restore();
      if (showName) {
        {
          ctx.save();
          ctx.font = 12 * scale + "px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(player.name, playerX, playerY - 20 * scale);
          ctx.restore();
        }
      }
      showWeapon && (ctx.save(), ctx.font = 12 * scale + "px Arial", ctx.fillStyle = "white", ctx.textAlign = "center", ctx.fillText(player.weapon, playerX, playerY + 30 * scale), ctx.restore());
      if (showHelmet && player.helmet.level !== "none") drawHelmet(player, playerX - 30 * scale, playerY);
      if (showArmor && player.armor.level !== "none") drawArmor(player, playerX + 30 * scale, playerY);
      if (showHealth) drawHealthBar(player, playerX, playerY + 45 * scale);
      if (showDirection) drawDirection(player, playerX, playerY);
    }
  });
}

/**
 * 处理玩家点击事件
 * @param {MouseEvent} event 鼠标事件对象
 */
function handlePlayerClick(event) {
  const x = (event.clientX - offsetX) / scale,
    y = (event.clientY - offsetY) / scale;
  players.forEach(player => {
    const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
    distance < 15 && (selectedPlayerName = player.name, selectedPlayerTeam = player.teamId);
  });
  drawMap();
  saveSettings();
}

/**
 * 绘制玩家朝向
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawDirection(player, x, y) {
  const length = 20 * scale,
    angle = player.direction * Math.PI / 180,
    endX = x + length * Math.cos(angle),
    endY = y + length * Math.sin(angle);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制头盔
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawHelmet(player, x, y) {
  const radius = 10 * scale,
    startAngle = -Math.PI / 2,
    endAngle = startAngle - 2 * Math.PI * (player.helmet.durability / 100);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#808080";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, startAngle, endAngle, true);
  ctx.fillStyle = colorMap[player.helmet.level];
  ctx.fill();
  ctx.restore();
}

/**
 * 绘制护甲
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawArmor(player, x, y) {
  const radius = 10 * scale,
    startAngle = -Math.PI / 2,
    endAngle = startAngle - 2 * Math.PI * (player.armor.durability / 100);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#808080";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, startAngle, endAngle, true);
  ctx.fillStyle = colorMap[player.armor.level];
  ctx.fill();
  ctx.restore();
}

/**
 * 绘制血条
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawHealthBar(player, x, y) {
  const width = 60 * scale,
    height = 10 * scale,
    yOffset = -10 * scale;
  ctx.save();
  ctx.fillStyle = "#808080";
  ctx.fillRect(x - width / 2, y + yOffset, width, height);
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x - width / 2, y + yOffset, width * (player.health / 100), height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2, y + yOffset, width, height);
  ctx.restore();
}

/**
 * 创建控制面板
 */
function createControlPanel() {
  const controlPanel = document.createElement("div");
  controlPanel.style.position = "fixed";
  controlPanel.style.bottom = "10px";
  controlPanel.style.left = "50%";
  controlPanel.style.transform = "translateX(-50%)";
  controlPanel.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  controlPanel.style.padding = "10px";
  controlPanel.style.borderRadius = "5px";
  controlPanel.style.display = "flex";
  controlPanel.style.gap = "20px";
  const toggles = [{
    "label": "血量",
    "value": "showHealth",
    "state": showHealth
  }, {
    "label": "名称",
    "value": "showName",
    "state": showName
  }, {
    "label": "头盔",
    "value": "showHelmet",
    "state": showHelmet
  }, {
    "label": "护甲",
    "value": "showArmor",
    "state": showArmor
  }, {
    "label": "武器名称",
    "value": "showWeapon",
    "state": showWeapon
  }, {
    "label": "朝向",
    "value": "showDirection",
    "state": showDirection
  }, {
    "label": "追踪",
    "value": "trackingMode",
    "state": trackingMode !== "none"
  }];
  toggles.forEach(toggle => {
    {
      const label = document.createElement("label");
      label.style.color = "white";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = toggle.state;
      checkbox.addEventListener("change", () => handleToggleChange(toggle.value, checkbox.checked));
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(toggle.label));
      controlPanel.appendChild(label);
    }
  });
  document.body.appendChild(controlPanel);
}

/**
 * 处理控制面板选项变化
 * @param {string} value 选项值
 * @param {boolean} checked 选项状态
 */
function handleToggleChange(value, checked) {
  if (value === "showHealth") showHealth = checked;
  if (value === "showName") showName = checked;
  if (value === "showHelmet") showHelmet = checked;
  if (value === "showArmor") showArmor = checked;
  if (value === "showWeapon") showWeapon = checked;
  if (value === "showDirection") showDirection = checked;
  if (value === "trackingMode") trackingMode = checked ? "track" : "none";
  saveSettings();
  drawMap();
}

/**
 * 中心化玩家
 * @param {Object} player 玩家对象
 */
function centerOnPlayer(player) {
  const centerX = canvas.width / 2,
    centerY = canvas.height / 2;
  offsetX = centerX - player.x * scale;
  offsetY = centerY - player.y * scale;
}

/**
 * 处理WebSocket消息
 * @param {MessageEvent} event WebSocket消息事件对象
 */
socket.onmessage = event => {
  try {
    {
      const data = JSON.parse(event.data);
      if (data.type === "map") img.src = data.map + ".jpg";
      else data.type === "update" && Array.isArray(data.players) && (players = data.players, drawMap());
    }
  } catch (error) {
    console.error("WebSocket 消息解析错误:", error);
  }
};

/**
 * 初始化雷达地图页面
 */
createRadarPage();