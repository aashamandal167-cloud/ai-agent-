function openSidebar() {
  document.getElementById("sidebar").classList.add("active");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
}

/* MENU CLICK */

const menuItems = document.querySelectorAll(".menu li");

menuItems.forEach(item => {
  item.addEventListener("click", () => {

    // remove old active
    menuItems.forEach(i => i.classList.remove("active-menu"));

    // add new active
    item.classList.add("active-menu");

    // chat message change
    const chatArea = document.querySelector(".chat-area");

    chatArea.innerHTML = `
      <div class="bot-message">
        ${item.innerText} section opened successfully 🚀
      </div>
    `;

    closeSidebar();
  });
});

/* SEND MESSAGE */

const sendBtn = document.querySelector(".send-btn");
const textarea = document.querySelector("textarea");
const chatArea = document.querySelector(".chat-area");

sendBtn.addEventListener("click", sendMessage);

textarea.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {

  const message = textarea.value.trim();

  if(message === "") return;

  // user message
  const userDiv = document.createElement("div");
  userDiv.className = "user-message";
  userDiv.innerText = message;

  chatArea.appendChild(userDiv);

  // fake ai reply
  const botDiv = document.createElement("div");
  botDiv.className = "bot-message";
  botDiv.innerText = "Raaz Chandrvashi is processing your request... 🚀";

  chatArea.appendChild(botDiv);

  textarea.value = "";

  // auto scroll
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* PLUS BUTTON */

function openSidebar() {
  document.getElementById("sidebar").classList.add("active");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
}

/* MENU CLICK */

const menuItems = document.querySelectorAll(".menu li");

menuItems.forEach(item => {
  item.addEventListener("click", () => {

    menuItems.forEach(i => i.classList.remove("active-menu"));

    item.classList.add("active-menu");

    const chatArea = document.querySelector(".chat-area");

    chatArea.innerHTML = `
      <div class="bot-message">
        ${item.innerText} section opened successfully 🚀
      </div>
    `;

    closeSidebar();
  });
});

/* SEND MESSAGE */

const sendBtn = document.querySelector(".send-btn");
const textarea = document.querySelector("textarea");
const chatArea = document.querySelector(".chat-area");

sendBtn.addEventListener("click", sendMessage);

textarea.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {

  const message = textarea.value.trim();

  if(message === "") return;

  const userDiv = document.createElement("div");

  userDiv.className = "user-message";

  userDiv.innerText = message;

  chatArea.appendChild(userDiv);

  const botDiv = document.createElement("div");

  botDiv.className = "bot-message";

  botDiv.innerText =
    "Raaz Chandrvashi is processing your request... 🚀";

  chatArea.appendChild(botDiv);

  textarea.value = "";

  chatArea.scrollTop = chatArea.scrollHeight;
}

/* FILE UPLOAD */

const fileUpload = document.getElementById("fileUpload");

fileUpload.addEventListener("change", () => {

  const file = fileUpload.files[0];

  if(!file) return;

  const userDiv = document.createElement("div");

  userDiv.className = "user-message";

  userDiv.innerText = `📎 Uploaded: ${file.name}`;

  chatArea.appendChild(userDiv);

  const botDiv = document.createElement("div");

  botDiv.className = "bot-message";

  botDiv.innerText =
    "File received successfully 🚀";

  chatArea.appendChild(botDiv);

  chatArea.scrollTop = chatArea.scrollHeight;
});
plusBtn.addEventListener("click", () => {

  const botDiv = document.createElement("div");

  botDiv.className = "bot-message";

  botDiv.innerText =
    "New AI task creator coming soon 🚀";

  chatArea.appendChild(botDiv);

  chatArea.scrollTop = chatArea.scrollHeight;
});
