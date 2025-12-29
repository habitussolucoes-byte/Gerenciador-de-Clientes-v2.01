import React from "react";
import ReactDOM from "react-dom/client";

const App = () =>
  React.createElement(
    "div",
    { style: { padding: "20px", fontFamily: "sans-serif" } },
    React.createElement("h1", null, "Gerenciador TV Online"),
    React.createElement("p", null, "Aplicação carregada com sucesso ✅")
  );

ReactDOM
  .createRoot(document.getElementById("root"))
  .render(App());
