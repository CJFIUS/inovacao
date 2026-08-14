import React from "react";
import { createRoot } from "react-dom/client";
import CalculadoraPrazos from "./CalculadoraPrazos.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CalculadoraPrazos />
  </React.StrictMode>
);
