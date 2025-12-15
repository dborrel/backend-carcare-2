import "../models/index.js";
import express from "express";
import { verificarToken } from "../middlewares/authMiddleware.js";
import { obtenerVehiculosUsuario, obtenerUbicacionVehiculo, actualizarUbicacionVehiculo, 
    registrarVehiculo, eliminarVehiculo, editarVehiculo, eliminarUsuarioDeVehiculo, 
    actualizarEstadoVehiculo } from "../controllers/vehiculoController.js";

const router = express.Router();

router.post('/registrar', verificarToken, registrarVehiculo);
router.get('/obtenerVehiculos/:usuarioId', verificarToken, obtenerVehiculosUsuario);
router.get('/obtenerUbicacion/:vehiculoId', verificarToken, obtenerUbicacionVehiculo);
router.put('/actualizarUbicacion/:vehiculoId', verificarToken, actualizarUbicacionVehiculo);
router.delete('/eliminar/:vehiculoId', verificarToken, eliminarVehiculo);
router.put('/editar/:vehiculoId', verificarToken, editarVehiculo);
router.post('/eliminarUsuario/:vehiculoId', verificarToken, eliminarUsuarioDeVehiculo);
router.patch('/:vehiculoId/estado', verificarToken, actualizarEstadoVehiculo);
export default router;