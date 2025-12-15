import express from 'express';
import { 
  procesarPagoSimulado,
  obtenerEstadoSuscripcion,
  cancelarSuscripcion,
  verificarMostrarAnuncio 
} from '../controllers/suscripcionController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.post('/procesar-pago', verificarToken, procesarPagoSimulado);
router.get('/estado', verificarToken, obtenerEstadoSuscripcion);
router.post('/cancelar', verificarToken, cancelarSuscripcion);
router.get('/verificar-anuncio', verificarToken, verificarMostrarAnuncio);

export default router;