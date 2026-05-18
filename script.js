function openSidebar() {
‎  document.getElementById("sidebar").classList.add("active");
‎}
‎
‎function closeSidebar() {
‎  document.getElementById("sidebar").classList.remove("active");
‎}
‎
‎const chatArea = document.querySelector(".chat-area");
‎
‎/* PAGES */
‎
‎const pages = {
‎
‎  dashboard: `
‎    <div class="bot-message">
‎      📊 Dashboard Opened <br><br>
‎      Total Clients: 12 <br>
‎      Active Orders: 5 <br>
‎      Revenue: ₹85,000 🚀
‎    </div>
‎  `,
‎
‎  leads: `
‎    <div class="bot-message">
‎      📋 Leads Section <br><br>
‎      • Gym Owner Delhi <br>
‎      • Restaurant Mumbai <br>
‎      • Shop Ahmedabad
‎    </div>
‎  `,
‎
‎  clients: `
‎    <div class="bot-message">
‎      👥 Clients Section <br><br>
‎      • Raj Fitness <br>
‎      • DK Restaurant <br>
‎      • Sharma Electronics
‎    </div>
‎  `,
‎
‎  orders: `
‎    <div class="bot-message">
‎      🛒 Orders Section <br><br>
‎      3 Website Orders Running 🚀
‎    </div>
‎  `,
‎
‎  services: `
‎    <div class="bot-message">
‎      📦 Services <br><br>
‎      • Business Website <br>
‎      • 3D Website <br>
‎      • Animated Premium Website
‎    </div>
‎  `,
‎
‎  campaigns: `
‎    <div class="bot-message">
‎      🚀 Campaign Manager <br><br>
‎      AI Ads Running Successfully ✅
‎    </div>
‎  `,
‎
‎  outreach: `
‎    <div class="bot-message">
‎      📩 Outreach System <br><br>
‎      120 Messages Sent Today 🚀
‎    </div>
‎  `,
‎
‎  invoices: `
‎    <div class="bot-message">
‎      🧾 Invoices <br><br>
‎      Pending Payments: ₹40,000
‎    </div>
‎  `,
‎
‎  aiagent: `
‎    <div class="bot-message">
‎      🤖 AI Agent Panel <br><br>
‎      Raaz Chandrvashi AI is running 24/7 🚀
‎    </div>
‎  `,
‎
‎  payments: `
‎    <div class="bot-message">
‎      💳 Payments <br><br>
‎      Today's Revenue: ₹12,000
‎    </div>
‎  `,
‎
‎  aitools: `
‎    <div class="bot-message">
‎      ✨ AI Tools <br><br>
‎      • Lead Hunter AI <br>
‎      • Website Builder AI <br>
‎      • Outreach AI
‎    </div>
‎  `,
‎
‎  analytics: `
‎    <div class="bot-message">
‎      📈 Analytics <br><br>
‎      Growth Increased by 230% 🚀
‎    </div>
‎  `,
‎
‎  settings: `
‎    <div class="bot-message">
‎      ⚙️ Settings Opened
‎    </div>
‎  `
‎
‎};
‎
‎/* MENU */
‎
‎const menuItems = document.querySelectorAll(".menu li");
‎
‎menuItems.forEach(item => {
‎
‎  item.addEventListener("click", () => {
‎
‎    menuItems.forEach(i => {
‎      i.classList.remove("active-menu");
‎    });
‎
‎    item.classList.add("active-menu");
‎
‎    const text = item.innerText.toLowerCase();
‎
‎    if(text.includes("dashboard")){
‎      chatArea.innerHTML = pages.dashboard;
‎    }
‎
‎    else if(text.includes("lead")){
‎      chatArea.innerHTML = pages.leads;
‎    }
‎
‎    else if(text.includes("client")){
‎      chatArea.innerHTML = pages.clients;
‎    }
‎
‎    else if(text.includes("order")){
‎      chatArea.innerHTML = pages.orders;
‎    }
‎
‎    else if(text.includes("service")){
‎      chatArea.innerHTML = pages.services;
‎    }
‎
‎    else if(text.includes("campaign")){
‎      chatArea.innerHTML = pages.campaigns;
‎    }
‎
‎    else if(text.includes("outreach")){
‎      chatArea.innerHTML = pages.outreach;
‎    }
‎
‎    else if(text.includes("invoice")){
‎      chatArea.innerHTML = pages.invoices;
‎    }
‎
‎    else if(text.includes("ai agent")){
‎      chatArea.innerHTML = pages.aiagent;
‎    }
‎
‎    else if(text.includes("payment")){
‎      chatArea.innerHTML = pages.payments;
‎    }
‎
‎    else if(text.includes("ai tools")){
‎      chatArea.innerHTML = pages.aitools;
‎    }
‎
‎    else if(text.includes("analytics")){
‎      chatArea.innerHTML = pages.analytics;
‎    }
‎
‎    else if(text.includes("setting")){
‎      chatArea.innerHTML = pages.settings;
‎    }
‎
‎    closeSidebar();
‎
‎  });
‎
‎});
‎
‎/* SEND MESSAGE */
‎
‎const sendBtn = document.querySelector(".send-btn");
‎
‎const textarea = document.querySelector("textarea");
‎
‎sendBtn.addEventListener("click", sendMessage);
‎
‎textarea.addEventListener("keydown", function(e){
‎
‎  if(e.key === "Enter" && !e.shiftKey){
‎
‎    e.preventDefault();
‎
‎    sendMessage();
‎
‎  }
‎
‎});
‎
‎async function sendMessage(){
‎
‎  const message = textarea.value.trim();
‎
‎  if(message === "") return;
‎
‎  const userDiv = document.createElement("div");
‎
‎  userDiv.className = "user-message";
‎
‎  userDiv.innerText = message;
‎
‎  chatArea.appendChild(userDiv);
‎
‎  textarea.value = "";
‎
‎  const botDiv = document.createElement("div");
‎
‎  botDiv.className = "bot-message";
‎
‎  botDiv.innerText =
‎    "Raaz Chandrvashi is processing your request... 🚀";
‎
‎  chatArea.appendChild(botDiv);
‎
‎  chatArea.scrollTop = chatArea.scrollHeight;
‎
‎  try {
‎
‎    const response = await fetch("/chat", {
‎
‎      method: "POST",
‎
‎      headers: {
‎        "Content-Type": "application/json"
‎      },
‎
‎      body: JSON.stringify({
‎        message: message
‎      })
‎
‎    });
‎
‎    const data = await response.json();
‎
‎    botDiv.innerText = data.reply;
‎
‎    if(
‎      message.toLowerCase().includes("payment") ||
‎      message.toLowerCase().includes("pay") ||
‎      message.toLowerCase().includes("price")
‎    ){
‎
‎      const qrUrl =
‎      
‎https://collection.cloudinary.com/dedyoeauv/ecb96aef2f70867a9e902db3ca5233e5
‎
‎      const paymentDiv =
‎      document.createElement("div");
‎
‎      paymentDiv.className =
‎      "bot-message";
‎
‎      paymentDiv.innerHTML = `
‎        💳 Payment ke liye QR scan kare 🙂<br><br>
‎
‎        <img
‎          src="${qrUrl}"
‎          width="220"
‎          style="border-radius:20px;"
‎        >
‎      `;
‎
‎      chatArea.appendChild(paymentDiv);
‎
‎    }
‎
‎    chatArea.scrollTop =
‎    chatArea.scrollHeight;
‎
‎  } catch(error){
‎
‎    botDiv.innerText =
‎    "Server error 🚨";
‎
‎  }
‎
‎}
‎
‎/* FILE UPLOAD */
‎
‎const fileUpload =
‎document.getElementById("fileUpload");
‎
‎fileUpload.addEventListener("change", function(){
‎
‎  const file = fileUpload.files[0];
‎
‎  if(!file) return;
‎
‎  const userDiv =
‎  document.createElement("div");
‎
‎  userDiv.className =
‎  "user-message";
‎
‎  userDiv.innerText =
‎  "📎 Uploaded: " + file.name;
‎
‎  chatArea.appendChild(userDiv);
‎
‎  const botDiv =
‎  document.createElement("div");
‎
‎  botDiv.className =
‎  "bot-message";
‎
‎  botDiv.innerText =
‎  "File uploaded successfully 🚀";
‎
‎  chatArea.appendChild(botDiv);
‎
‎  chatArea.scrollTop =
‎  chatArea.scrollHeight;
‎
‎});
‎
