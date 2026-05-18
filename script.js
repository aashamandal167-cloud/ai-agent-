console.log("JS LOADED");

// wait until DOM is ready (VERY IMPORTANT for Render)
document.addEventListener("DOMContentLoaded", () => {

  alert("SCRIPT WORKING");

  const chatArea = document.querySelector(".chat-area");
  const sendBtn = document.querySelector(".send-btn");
  const textarea = document.querySelector("textarea");
  const fileUpload = document.getElementById("fileUpload");
  const menuItems = document.querySelectorAll(".menu li");

  /* SIDEBAR */
  window.openSidebar = function () {
    document.getElementById("sidebar").classList.add("active");
  };

  window.closeSidebar = function () {
    document.getElementById("sidebar").classList.remove("active");
  };

  /* PAGES */
  const pages = {
    dashboard: `📊 Dashboard Opened <br><br>Total Clients: 12<br>Active Orders: 5<br>Revenue: ₹85,000 🚀`,
    leads: `📋 Leads Section <br>Gym Owner Delhi<br>Restaurant Mumbai<br>Shop Ahmedabad`,
    clients: `👥 Clients Section<br>Raj Fitness<br>DK Restaurant<br>Sharma Electronics`,
    orders: `🛒 Orders Section<br>3 Website Orders Running 🚀`,
    services: `📦 Services<br>Business Website<br>3D Website<br>Animated Website`,
    campaigns: `🚀 Campaigns Running Successfully`,
    outreach: `📩 Outreach: 120 Messages Sent Today`,
    invoices: `🧾 Pending Payments ₹40,000`,
    aiagent: `🤖 AI Agent Running 24/7`,
    payments: `💳 Today's Revenue ₹12,000`,
    aitools: `✨ AI Tools Active`,
    analytics: `📈 Growth Increased 230% 🚀`,
    settings: `⚙️ Settings Opened`
  };

  /* MENU CLICK */
  menuItems.forEach(item => {
    item.addEventListener("click", () => {

      menuItems.forEach(i => i.classList.remove("active-menu"));
      item.classList.add("active-menu");

      const text = item.innerText.toLowerCase();

      if (text.includes("dashboard")) chatArea.innerHTML = pages.dashboard;
      else if (text.includes("lead")) chatArea.innerHTML = pages.leads;
      else if (text.includes("client")) chatArea.innerHTML = pages.clients;
      else if (text.includes("order")) chatArea.innerHTML = pages.orders;
      else if (text.includes("service")) chatArea.innerHTML = pages.services;
      else if (text.includes("campaign")) chatArea.innerHTML = pages.campaigns;
      else if (text.includes("outreach")) chatArea.innerHTML = pages.outreach;
      else if (text.includes("invoice")) chatArea.innerHTML = pages.invoices;
      else if (text.includes("ai agent")) chatArea.innerHTML = pages.aiagent;
      else if (text.includes("payment")) chatArea.innerHTML = pages.payments;
      else if (text.includes("ai tools")) chatArea.innerHTML = pages.aitools;
      else if (text.includes("analytics")) chatArea.innerHTML = pages.analytics;
      else if (text.includes("setting")) chatArea.innerHTML = pages.settings;

      closeSidebar();
    });
  });

  /* SEND MESSAGE */
  async function sendMessage() {

    const message = textarea.value.trim();
    if (!message) return;

    const userDiv = document.createElement("div");
    userDiv.className = "user-message";
    userDiv.innerText = message;
    chatArea.appendChild(userDiv);

    textarea.value = "";

    const botDiv = document.createElement("div");
    botDiv.className = "bot-message";
    botDiv.innerText = "Processing... 🚀";
    chatArea.appendChild(botDiv);

    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      botDiv.innerText = data.reply || "No response";

    } catch (error) {
      botDiv.innerText = "Server error 🚨";
    }

    chatArea.scrollTop = chatArea.scrollHeight;
  }

  sendBtn.addEventListener("click", sendMessage);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* FILE UPLOAD */
  fileUpload.addEventListener("change", () => {

    const file = fileUpload.files[0];
    if (!file) return;

    const userDiv = document.createElement("div");
    userDiv.className = "user-message";
    userDiv.innerText = "📎 Uploaded: " + file.name;
    chatArea.appendChild(userDiv);

    const botDiv = document.createElement("div");
    botDiv.className = "bot-message";
    botDiv.innerText = "File uploaded successfully 🚀";
    chatArea.appendChild(botDiv);
  });

});
