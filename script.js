function openSidebar() {
  document.getElementById("sidebar").classList.add("active");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
}

const chatArea = document.querySelector(".chat-area");

/* MENU */

const menuItems = document.querySelectorAll(".menu li");

menuItems.forEach(item => {

  item.addEventListener("click", () => {

    menuItems.forEach(i => {
      i.classList.remove("active-menu");
    });

    item.classList.add("active-menu");

    const botDiv = document.createElement("div");

    botDiv.className = "bot-message";

    botDiv.innerText =
      item.innerText + " section opened successfully 🚀";

    chatArea.appendChild(botDiv);

    chatArea.scrollTop = chatArea.scrollHeight;

    closeSidebar();

  });

});

/* SEND MESSAGE */

const sendBtn = document.querySelector(".send-btn");

const textarea = document.querySelector("textarea");

sendBtn.addEventListener("click", sendMessage);

textarea.addEventListener("keydown", function(e){

  if(e.key === "Enter" && !e.shiftKey){

    e.preventDefault();

    sendMessage();

  }

});

function sendMessage(){

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

fileUpload.addEventListener("change", function(){

  const file = fileUpload.files[0];

  if(!file) return;

  const userDiv = document.createElement("div");

  userDiv.className = "user-message";

  userDiv.innerText =
    "📎 Uploaded: " + file.name;

  chatArea.appendChild(userDiv);

  const botDiv = document.createElement("div");

  botDiv.className = "bot-message";

  botDiv.innerText =
    "File uploaded successfully 🚀";

  chatArea.appendChild(botDiv);

  chatArea.scrollTop = chatArea.scrollHeight;

});
