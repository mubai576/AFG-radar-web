//Tue Apr 01 2025 10:05:05 GMT+0800 (中国标准时间)
//Base:<url id="cv1cref6o68qmpt26ol0" type="url" status="parsed" title="GitHub - echo094/decode-js: JS混淆代码的AST分析工具 AST analysis tool for obfuscated JS code" wc="2165">https://github.com/echo094/decode-js</url>
//Modify:<url id="cv1cref6o68qmpt26olg" type="url" status="parsed" title="GitHub - smallfawn/decode_action: 世界上本来不存在加密，加密的人多了，也便成就了解密" wc="741">https://github.com/smallfawn/decode_action</url>
let canvas,
  ctx,
  img,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  isDragging = false,
  trackingMode = "none",
  players = [],
  selectedPlayerName = null,
  selectedPlayerTeam = null,
  teamColors = {},
  lastTouchDistance = 0,
  showHealth = true,
  showName = true,
  showHelmet = true,
  showArmor = true,
  showWeapon = true,
  showDirection = true,
  ip = "",
  port = "";
const brightGreen = "#00FF00",
  colorMap = {
    "none": "transparent",
    "white": "#FFF",
    "blue": "#1E90FF",
    "purple": "#8A2BE2",
    "gold": "#FFD700",
    "red": "#DC143C"
  };
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem("radarSettings"));
  if (settings) {
    {
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
}
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
function generateNewTeamColor(existingColors) {
  let maxDifference = 0,
    bestColor = "";
  for (let i = 0; i < 10; i++) {
    const hue = Math.floor(Math.random() * 360);
    if (hue >= 70 && hue <= 160) continue;
    const newColor = "hsl(" + hue + ", 70%, 50%)";
    let minDifference = 360;
    existingColors.forEach(color => {
      {
        const hueDiff = getHueDifference(color, newColor);
        if (hueDiff < minDifference) minDifference = hueDiff;
      }
    });
    minDifference > maxDifference && (maxDifference = minDifference, bestColor = newColor);
  }
  return bestColor;
}
function getHueDifference(color1, color2) {
  const hue1 = parseInt(color1.match(/hsl\((\d+)/)[1]),
    hue2 = parseInt(color2.match(/hsl\((\d+)/)[1]),
    diff = Math.abs(hue1 - hue2);
  return Math.min(diff, 360 - diff);
}
function createRadarPage() {
  loadSettings();
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  img = new Image();
  img.src = "db.jpg";
  img.onload = () => {
    adjustImageToFit();
    drawMap();
  };
  canvas.addEventListener("mousedown", startDragging);
  canvas.addEventListener("mousemove", duringDragging);
  canvas.addEventListener("mouseup", stopDragging);
  canvas.addEventListener("wheel", handleZoom);
  canvas.addEventListener("click", handlePlayerClick);
  canvas.addEventListener("touchstart", handleTouchStart, {
    "passive": false
  });
  canvas.addEventListener("touchmove", handleTouchMove, {
    "passive": false
  });
  canvas.addEventListener("touchend", handleTouchEnd, {
    "passive": false
  });
  window.addEventListener("resize", resizeCanvas);
  createControlPanel();
}
function adjustImageToFit() {
  const aspectRatio = img.width / img.height,
    windowAspectRatio = window.innerWidth / window.innerHeight;
  scale = aspectRatio > windowAspectRatio ? window.innerWidth / img.width : window.innerHeight / img.height;
  offsetX = (window.innerWidth - img.width * scale) / 2;
  offsetY = (window.innerHeight - img.height * scale) / 2;
  resizeCanvas();
}
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
function handleTouchEnd() {
  isDragging = false;
  lastTouchDistance = 0;
}
function getTouchDistance(touches) {
  const deltaX = touches[0].clientX - touches[1].clientX,
    deltaY = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
function startDragging(event) {
  dragStart = {
    "x": event.clientX - offsetX,
    "y": event.clientY - offsetY
  };
  isDragging = true;
}
function duringDragging(event) {
  isDragging && (offsetX = event.clientX - dragStart.x, offsetY = event.clientY - dragStart.y, drawMap());
}
function stopDragging() {
  isDragging = false;
}
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
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawMap();
}
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
function centerOnPlayer(player) {
  const centerX = canvas.width / 2,
    centerY = canvas.height / 2;
  offsetX = centerX - player.x * scale;
  offsetY = centerY - player.y * scale;
}
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
createRadarPage();