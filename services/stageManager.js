if (state.stage === "DISCOVERY" && state.factsCount >= 4) {
  state.stage = "STORY";
}
else if (state.stage === "STORY" && userMessage.toLowerCase().includes("ha")) {
  state.stage = "DEMO";
}
else if (state.stage === "DEMO" && userMessage.toLowerCase().includes("achha")) {
  state.stage = "CATEGORY";
}
...
