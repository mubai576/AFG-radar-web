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
    windowAspectRatio = window.innerWidth / window.innerHeight; // 获取窗口宽高比 
  scale = aspectRatio > windowAspectRatio ? window.innerWidth / img.width : window.innerHeight / img.height; // 根据宽高比计算缩放比例
  offsetX = (window.innerWidth - img.width * scale) / 2; // 计算水平偏移量
  offsetY = (window.innerHeight - img.height * scale) / 2; // 计算垂直偏移量
  resizeCanvas(); // 调整画布大小
}

/**
 * 处理触摸开始事件
 * @param {TouchEvent} event 触摸事件对象
 */
function handleTouchStart(event) {
  event.preventDefault(); // 阻止默认行为
  if (event.touches.length === 1) { // 如果只有一个触摸点
    {
      const touch = event.touches[0]; // 获取第一个触摸点
      dragStart = {
        "x": touch.clientX - offsetX, // 计算触摸点相对于画布的偏移量
        "y": touch.clientY - offsetY
      };
      isDragging = true; // 设置拖动标志
    }
  } else event.touches.length === 2 && (lastTouchDistance = getTouchDistance(event.touches)); // 如果有两个触摸点，计算触摸距离
}

/**
 * 处理触摸移动事件
 * @param {TouchEvent} event 触摸事件对象
 */
function handleTouchMove(event) {
  event.preventDefault(); // 阻止默认行为
  if (isDragging && event.touches.length === 1) { // 如果正在拖动且只有一个触摸点
    const touch = event.touches[0]; // 获取第一个触摸点
    offsetX = touch.clientX - dragStart.x; // 计算触摸点相对于拖动开始的偏移量
    offsetY = touch.clientY - dragStart.y; // 计算触摸点相对于拖动开始的偏移量
    drawMap(); // 绘制地图
  } else {
    if (event.touches.length === 2) { // 如果有两个触摸点
      const currentDistance = getTouchDistance(event.touches), // 计算当前触摸距离
        scale_factor = currentDistance / lastTouchDistance; // 计算缩放因子
      lastTouchDistance = currentDistance; // 更新上次触摸距离
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2, // 计算触摸点中心点X坐标
        centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2; // 计算触摸点中心点Y坐标
      scale *= scale_factor; // 更新缩放比例
      scale = Math.max(0.1, scale); // 确保缩放比例不低于0.1
      offsetX -= (centerX - offsetX) * (scale_factor - 1); // 更新水平偏移量
      offsetY -= (centerY - offsetY) * (scale_factor - 1); // 更新垂直偏移量
      drawMap(); // 绘制地图
    }
  }
}

/**
 * 处理触摸结束事件
 */
function handleTouchEnd() {
  isDragging = false; // 停止拖动
  lastTouchDistance = 0; // 重置触摸距离
}

/**
 * 获取触摸距离
 * @param {TouchList} touches 触摸点列表
 * @returns {number} 触摸距离
 */
function getTouchDistance(touches) {
  const deltaX = touches[0].clientX - touches[1].clientX, // 计算触摸点之间的X轴距离
    deltaY = touches[0].clientY - touches[1].clientY; // 计算触摸点之间的Y轴距离
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY); // 返回触摸点之间的距离
}

/**
 * 开始拖动
 * @param {MouseEvent} event 鼠标事件对象
 */
function startDragging(event) {
  dragStart = {
    "x": event.clientX - offsetX, // 计算鼠标点击位置相对于画布的偏移量
    "y": event.clientY - offsetY // 计算鼠标点击位置相对于画布的偏移量
  };
  isDragging = true; // 设置拖动标志
}

/**
 * 处理拖动事件
 * @param {MouseEvent} event 鼠标事件对象
 */
function duringDragging(event) {
  isDragging && (offsetX = event.clientX - dragStart.x, offsetY = event.clientY - dragStart.y, drawMap()); // 如果正在拖动，更新偏移量并绘制地图
}

/**
 * 停止拖动
 */
function stopDragging() {
  isDragging = false; // 停止拖动
}

/**
 * 处理缩放事件
 * @param {WheelEvent} event 鼠标滚轮事件对象
 */
function handleZoom(event) {
  event.preventDefault(); // 阻止默认行为
  const zoomStep = 0.1, // 缩放步长
    oldScale = scale; // 保存旧的缩放比例
  scale += event.deltaY < 0 ? zoomStep : -zoomStep; // 根据滚轮方向更新缩放比例
  scale = Math.max(0.1, scale); // 确保缩放比例不低于0.1
  const mouseX = event.clientX, // 获取鼠标X坐标
    mouseY = event.clientY; // 获取鼠标Y坐标
  offsetX -= (mouseX - offsetX) * (scale / oldScale - 1); // 更新水平偏移量
  offsetY -= (mouseY - offsetY) * (scale / oldScale - 1); // 更新垂直偏移量
  drawMap(); // 绘制地图
}

/**
 * 调整画布大小
 */
function resizeCanvas() {
  canvas.width = window.innerWidth; // 更新画布宽度
  canvas.height = window.innerHeight; // 更新画布高度
  drawMap(); // 绘制地图
}

/**
 * 绘制地图
 */
function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布
  ctx.save(); // 保存当前状态
  ctx.translate(offsetX, offsetY); // 应用偏移量
  ctx.scale(scale, scale); // 应用缩放比例
  ctx.drawImage(img, 0, 0); // 绘制地图图像
  ctx.restore(); // 恢复之前的状态
  drawPlayers(); // 绘制玩家
  if (trackingMode !== "none" && selectedPlayerName) { // 如果追踪模式开启且有选中的玩家  
    const selectedPlayer = players.find(player => player.name === selectedPlayerName); // 找到选中的玩家
    if (selectedPlayer) centerOnPlayer(selectedPlayer); // 将选中的玩家居中显示
  }
}

/**
 * 绘制玩家
 */
function drawPlayers() {
  players.forEach(player => {
    {
      const playerX = player.x * scale + offsetX, // 计算玩家X坐标
        playerY = player.y * scale + offsetY, // 计算玩家Y坐标
        radius = 15 * scale; // 玩家半径
      if (!teamColors[player.teamId]) { // 如果玩家团队没有对应的团队颜色
        const existingColors = Object.values(teamColors); // 获取所有已有的团队颜色
        teamColors[player.teamId] = generateNewTeamColor(existingColors); // 生成新的团队颜色
      }
      let teamColor = teamColors[player.teamId]; // 获取玩家团队的团队颜色
      if (selectedPlayerName && (player.name === selectedPlayerName || player.teamId === selectedPlayerTeam)) { // 如果选中的玩家是当前玩家或团队相同
        teamColor = brightGreen; // 设置高亮绿色
      }
      ctx.save(); // 保存当前状态
      ctx.beginPath(); // 开始绘制路径
      ctx.arc(playerX, playerY, radius, 0, 2 * Math.PI); // 绘制圆形
      ctx.fillStyle = teamColor; // 设置填充颜色
      ctx.fill(); // 填充圆形
      ctx.restore(); // 恢复之前的状态
      if (showName) { // 如果显示玩家名称
        {
          ctx.save(); // 保存当前状态
          ctx.font = 12 * scale + "px Arial"; // 设置字体大小
          ctx.fillStyle = "white"; // 设置文本颜色
          ctx.textAlign = "center"; // 设置文本对齐方式
          ctx.fillText(player.name, playerX, playerY - 20 * scale); // 绘制玩家名称
          ctx.restore(); // 恢复之前的状态
        }
      }
      showWeapon && (ctx.save(), ctx.font = 12 * scale + "px Arial", ctx.fillStyle = "white", ctx.textAlign = "center", ctx.fillText(player.weapon, playerX, playerY + 30 * scale), ctx.restore()); // 如果显示武器名称，绘制武器名称
      if (showHelmet && player.helmet.level !== "none") drawHelmet(player, playerX - 30 * scale, playerY); // 如果显示头盔且头盔等级不为无，绘制头盔    
      if (showArmor && player.armor.level !== "none") drawArmor(player, playerX + 30 * scale, playerY); // 如果显示护甲且护甲等级不为无，绘制护甲 
      if (showHealth) drawHealthBar(player, playerX, playerY + 45 * scale); // 如果显示血量，绘制血条
      if (showDirection) drawDirection(player, playerX, playerY); // 如果显示朝向，绘制朝向
    }
  });
}

/**
 * 处理玩家点击事件
 * @param {MouseEvent} event 鼠标事件对象
 */
function handlePlayerClick(event) {
  const x = (event.clientX - offsetX) / scale, // 计算鼠标点击位置相对于画布的偏移量
    y = (event.clientY - offsetY) / scale; // 计算鼠标点击位置相对于画布的偏移量
  players.forEach(player => {
    const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2); // 计算玩家与点击位置之间的距离
    distance < 15 && (selectedPlayerName = player.name, selectedPlayerTeam = player.teamId); // 如果距离小于15，设置选中的玩家名称和团队ID
  });
  drawMap(); // 绘制地图
  saveSettings(); // 保存设置
}

/**
 * 绘制玩家朝向
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawDirection(player, x, y) {
  const length = 20 * scale, // 朝向长度
    angle = player.direction * Math.PI / 180, // 朝向角度
    endX = x + length * Math.cos(angle), // 计算朝向的终点坐标
    endY = y + length * Math.sin(angle); // 计算朝向的终点坐标
  ctx.save(); // 保存当前状态
  ctx.beginPath(); // 开始绘制路径
  ctx.moveTo(x, y); // 移动到起点
  ctx.lineTo(endX, endY); // 绘制直线
  ctx.strokeStyle = "yellow"; // 设置线条颜色
  ctx.lineWidth = 2; // 设置线条宽度
  ctx.stroke(); // 绘制线条
  ctx.restore(); // 恢复之前的状态
}

/**
 * 绘制头盔
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawHelmet(player, x, y) {
  const radius = 10 * scale, // 头盔半径
    startAngle = -Math.PI / 2, // 开始角度
    endAngle = startAngle - 2 * Math.PI * (player.helmet.durability / 100); // 结束角度
  ctx.save(); // 保存当前状态
  ctx.beginPath(); // 开始绘制路径
  ctx.arc(x, y, radius, 0, 2 * Math.PI); // 绘制圆形
  ctx.fillStyle = "#808080"; // 设置填充颜色
  ctx.fill(); // 填充圆形
  ctx.beginPath(); // 开始绘制路径
  ctx.moveTo(x, y); // 移动到起点
  ctx.arc(x, y, radius, startAngle, endAngle, true); // 绘制弧线
  ctx.fillStyle = colorMap[player.helmet.level]; // 设置填充颜色
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
  const radius = 10 * scale, // 护甲半径
    startAngle = -Math.PI / 2, // 开始角度
    endAngle = startAngle - 2 * Math.PI * (player.armor.durability / 100); // 结束角度
  ctx.save(); // 保存当前状态
  ctx.beginPath(); // 开始绘制路径
  ctx.arc(x, y, radius, 0, 2 * Math.PI); // 绘制圆形
  ctx.fillStyle = "#808080"; // 设置填充颜色
  ctx.fill(); // 填充圆形
  ctx.beginPath(); // 开始绘制路径
  ctx.moveTo(x, y); // 移动到起点
  ctx.arc(x, y, radius, startAngle, endAngle, true); // 绘制弧线
  ctx.fillStyle = colorMap[player.armor.level]; // 设置填充颜色
  ctx.fill(); // 填充圆形
  ctx.restore(); // 恢复之前的状态
}

/**
 * 绘制血条
 * @param {Object} player 玩家对象
 * @param {number} x 玩家X坐标
 * @param {number} y 玩家Y坐标
 */
function drawHealthBar(player, x, y) {
  const width = 60 * scale, // 血条宽度
    height = 10 * scale, // 血条高度
    yOffset = -10 * scale; // 血条偏移量
  ctx.save(); // 保存当前状态
  ctx.fillStyle = "#808080"; // 设置填充颜色
  ctx.fillRect(x - width / 2, y + yOffset, width, height); // 绘制血条背景
  ctx.fillStyle = "#FF0000"; // 设置填充颜色
  ctx.fillRect(x - width / 2, y + yOffset, width * (player.health / 100), height); // 绘制血条
  ctx.strokeStyle = "#000000"; // 设置线条颜色
  ctx.lineWidth = 1; // 设置线条宽度
  ctx.strokeRect(x - width / 2, y + yOffset, width, height); // 绘制血条边框
  ctx.restore(); // 恢复之前的状态
}

/**
 * 创建控制面板
 */
function createControlPanel() {
  const controlPanel = document.createElement("div"); // 创建控制面板元素
  controlPanel.style.position = "fixed"; // 设置控制面板位置
  controlPanel.style.bottom = "10px"; // 设置控制面板底部偏移量
  controlPanel.style.left = "50%"; // 设置控制面板左侧偏移量
  controlPanel.style.transform = "translateX(-50%)"; // 设置控制面板水平居中
  controlPanel.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 设置控制面板背景颜色
  controlPanel.style.padding = "10px"; // 设置控制面板内边距
  controlPanel.style.borderRadius = "5px"; // 设置控制面板圆角
  controlPanel.style.display = "flex"; // 设置控制面板为弹性布局
  controlPanel.style.gap = "20px"; // 设置控制面板间距
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
      const label = document.createElement("label"); // 创建标签元素
      label.style.color = "white"; // 设置标签颜色
      const checkbox = document.createElement("input"); // 创建复选框元素
      checkbox.type = "checkbox"; // 设置复选框类型
      checkbox.checked = toggle.state; // 设置复选框状态
      checkbox.addEventListener("change", () => handleToggleChange(toggle.value, checkbox.checked)); // 添加复选框变化事件监听器
      label.appendChild(checkbox); // 将复选框添加到标签中
      label.appendChild(document.createTextNode(toggle.label)); // 将标签文本添加到标签中
      controlPanel.appendChild(label); // 将标签添加到控制面板中
    }
  });
  document.body.appendChild(controlPanel); // 将控制面板添加到页面中
}

/**
 * 处理控制面板选项变化
 * @param {string} value 选项值
 * @param {boolean} checked 选项状态
 */
function handleToggleChange(value, checked) {
  if (value === "showHealth") showHealth = checked; // 如果选项值为血量，更新血量状态
  if (value === "showName") showName = checked; // 如果选项值为名称，更新名称状态
  if (value === "showHelmet") showHelmet = checked; // 如果选项值为头盔，更新头盔状态
  if (value === "showArmor") showArmor = checked; // 如果选项值为护甲，更新护甲状态
  if (value === "showWeapon") showWeapon = checked; // 如果选项值为武器名称，更新武器名称状态
  if (value === "showDirection") showDirection = checked; // 如果选项值为朝向，更新朝向状态
  if (value === "trackingMode") trackingMode = checked ? "track" : "none"; // 如果选项值为追踪，更新追踪状态
  saveSettings(); // 保存设置
  drawMap(); // 绘制地图
}

/**
 * 中心化玩家
 * @param {Object} player 玩家对象
 */
function centerOnPlayer(player) {
  const centerX = canvas.width / 2, // 计算画布中心点X坐标
    centerY = canvas.height / 2; // 计算画布中心点Y坐标
  offsetX = centerX - player.x * scale; // 计算偏移量X
  offsetY = centerY - player.y * scale; // 计算偏移量Y
}

/**
 * 处理WebSocket消息
 * @param {MessageEvent} event WebSocket消息事件对象
 */
socket.onmessage = event => {
  try {
    {
      const data = JSON.parse(event.data); // 解析消息数据  
      if (data.type === "map") img.src = data.map + ".jpg"; // 如果消息类型为地图，更新地图图像源
      else data.type === "update" && Array.isArray(data.players) && (players = data.players, drawMap()); // 如果消息类型为更新，更新玩家列表并绘制地图
    }
  } catch (error) {
    console.error("WebSocket 消息解析错误:", error); // 处理WebSocket消息解析错误
  }
};

/**
 * 初始化雷达地图页面
 */
createRadarPage();