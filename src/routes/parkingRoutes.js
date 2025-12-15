import "../models/index.js";
import express from "express";
import { verificarToken } from "../middlewares/authMiddleware.js";
import { 
  crearParking, 
  obtenerParkingsUsuario, 
  obtenerParkingPorId,
  actualizarParking, 
  eliminarParking 
} from "../controllers/parkingController.js";

const router = express.Router();

router.post('/crear', verificarToken, crearParking);
router.get('/usuario/:usuarioId', verificarToken, obtenerParkingsUsuario);
router.get('/:parkingId', verificarToken, obtenerParkingPorId);
router.put('/actualizar/:parkingId', verificarToken, actualizarParking);
router.delete('/eliminar/:parkingId', verificarToken, eliminarParking);

export default router;