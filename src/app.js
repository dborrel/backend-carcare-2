import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.js";
import "./models/Associations.js";
import path from 'path';
import { fileURLToPath } from 'url';
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Configuración para subir archivos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Configuración para usar la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('📁 Sirviendo archivos estáticos desde:', path.join(__dirname, 'uploads'));

app.get("/", (req, res) => {
  res.status(200).json({ message: "API CarCare backend funcionando" });
});

// Rutas de usuarios
import usuarioRoutes from "./routes/usuarioRoutes.js";
app.use("/usuario", usuarioRoutes);

// Rutas de vehículos
import vehiculoRoutes from "./routes/vehiculoRoutes.js";
app.use("/vehiculo", vehiculoRoutes);

// Rutas de reservas
import reservaRoutes from "./routes/reservaRoutes.js";
app.use("/reserva", reservaRoutes);

// Rutas de invitaciones
import invitacionRoutes from "./routes/invitacionRoutes.js";
app.use("/invitacion", invitacionRoutes);

// Rutas de viajes
import viajeRoutes from "./routes/viajeRoutes.js";
app.use("/viaje", viajeRoutes);

// Rutas de repostajes
import repostajeRoutes from "./routes/repostajeRoutes.js";
app.use("/repostaje", repostajeRoutes);

// Rutas de logros
import logroRoutes from "./routes/logroRoutes.js";
app.use("/logro", logroRoutes);

// Rutas de incidencias
import incidenciaRoutes from "./routes/incidenciaRoutes.js";
app.use("/incidencia", incidenciaRoutes);

// Rutas de revisiones
import revisionRoutes from "./routes/revisionRoutes.js";
app.use("/revision", revisionRoutes);

// Rutas de estadísticas
import estadisticasRoutes from "./routes/estadisticasRoutes.js";
app.use("/estadisticas", estadisticasRoutes);

// Rutas de búsqueda
import busquedaRoutes from "./routes/busquedaRoutes.js";
app.use("/busqueda", busquedaRoutes);

// Rutas de parkings
import parkingRoutes from "./routes/parkingRoutes.js";
app.use("/parking", parkingRoutes);

// Rutas de suscripciones
import suscripcionRoutes from "./routes/suscripcionRoutes.js";
app.use("/suscripcion", suscripcionRoutes);

export default app;
