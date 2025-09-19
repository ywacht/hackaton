// server.js
const express = require("express");
const app = express();
const port = 3000;

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// Endpoint GET simple
app.get("/", (req, res) => {
  res.send("¡Hola desde la API!");
});

// Endpoint GET con parámetro
app.get("/saludo/:nombre", (req, res) => {
  const { nombre } = req.params;
  res.send(`Hola, ${nombre}!`);
});

// Endpoint POST para recibir datos en JSON
app.post("/usuario", (req, res) => {
  const { nombre, edad } = req.body;
  res.json({
    mensaje: `Usuario ${nombre} de ${edad} años recibido correctamente`,
    datos: { nombre, edad },
  });
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
