const WebSocket = require("ws");

let wss;
const clients = new Map(); // employeeID -> ws

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === "register" && data.employeeID) {
          clients.set(data.employeeID, ws);
          console.log(`Employee ${data.employeeID} connected`);
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("close", () => {
      for (const [employeeID, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(employeeID);
          break;
        }
      }
    });
  });
}

// Gửi thông báo
const sendPayrollNotification = (employeeID, message) => {
  const socket = clients.get(employeeID);
  if (socket && socket.readyState === 1) {
    socket.send(
      JSON.stringify({
        type: "payroll_notification",
        message,
      })
    );
  } else {
    console.log(`Không tìm thấy kết nối socket cho ${employeeID}`);
  }
};

module.exports = {
  initWebSocket,
  sendPayrollNotification,
};
