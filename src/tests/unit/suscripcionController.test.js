import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  procesarPagoSimulado, 
  obtenerEstadoSuscripcion, 
  cancelarSuscripcion,
  verificarMostrarAnuncio 
} from '../../controllers/suscripcionController.js';
import Usuario from '../../models/Usuario.js';

// Mock del modelo Usuario
vi.mock('../../models/Usuario.js');

describe('Suscripción Controller - Tests Unitarios', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      body: {},
      usuario: { id: 1 }
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('procesarPagoSimulado', () => {
    it('debería procesar un pago mensual correctamente', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '1234567890123456',
          cvv: '123',
          fecha_expiracion: '12/25'
        }
      };

      const mockUsuario = {
        id: 1,
        update: vi.fn().mockResolvedValue(true)
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);
      
      // Mockear Math.random para que siempre sea exitoso
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      await procesarPagoSimulado(req, res);

      expect(mockUsuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          es_premium: true,
          tipo_suscripcion: 'mensual'
        })
      );
    });

    it('debería rechazar tipo de suscripción inválido', async () => {
      req.body = {
        tipo_suscripcion: 'trimestral',
        datos_tarjeta: {
          numero: '1234567890123456',
          cvv: '123',
          fecha_expiracion: '12/25'
        }
      };

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Tipo de suscripción inválido.'
      });
    });

    it('debería rechazar datos de tarjeta incompletos', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '1234567890123456'
        }
      };

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Datos de tarjeta incompletos.'
      });
    });

    it('debería rechazar número de tarjeta inválido', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '12345',
          cvv: '123',
          fecha_expiracion: '12/25'
        }
      };

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Número de tarjeta inválido. Debe tener 16 dígitos.'
      });
    });

    it('debería rechazar CVV inválido', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '1234567890123456',
          cvv: '12',
          fecha_expiracion: '12/25'
        }
      };

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CVV inválido. Debe tener 3 dígitos.'
      });
    });

    it('debería rechazar fecha de expiración inválida', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '1234567890123456',
          cvv: '123',
          fecha_expiracion: 'invalid'
        }
      };

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Fecha de expiración inválida. Formato: MM/YY'
      });
    });

    it('debería simular pago rechazado', async () => {
      req.body = {
        tipo_suscripcion: 'mensual',
        datos_tarjeta: {
          numero: '1234567890123456',
          cvv: '123',
          fecha_expiracion: '12/25'
        }
      };

      Usuario.findByPk.mockResolvedValue({ id: 1 });
      
      // Mockear Math.random para que falle el pago
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      await procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Pago rechazado.',
        mensaje: 'La transacción fue rechazada. Por favor, verifica los datos de tu tarjeta.'
      });
    });
  });

  describe('obtenerEstadoSuscripcion', () => {
    it('debería obtener estado de usuario no premium', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: false,
        tipo_suscripcion: null,
        fecha_inicio_premium: null,
        fecha_fin_premium: null
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await obtenerEstadoSuscripcion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          es_premium: false,
          tipo_suscripcion: null
        })
      );
    });

    it('debería obtener estado de usuario premium activo', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const mockUsuario = {
        id: 1,
        es_premium: true,
        tipo_suscripcion: 'mensual',
        fecha_inicio_premium: new Date(),
        fecha_fin_premium: futureDate
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await obtenerEstadoSuscripcion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          es_premium: true,
          tipo_suscripcion: 'mensual'
        })
      );
    });

    it('debería actualizar estado si la suscripción ha expirado', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const mockUsuario = {
        id: 1,
        es_premium: true,
        tipo_suscripcion: 'mensual',
        fecha_inicio_premium: new Date(),
        fecha_fin_premium: pastDate,
        update: vi.fn().mockResolvedValue(true)
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await obtenerEstadoSuscripcion(req, res);

      expect(mockUsuario.update).toHaveBeenCalledWith({
        es_premium: false,
        tipo_suscripcion: null
      });
    });

    it('debería rechazar si usuario no existe', async () => {
      Usuario.findByPk.mockResolvedValue(null);

      await obtenerEstadoSuscripcion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado.'
      });
    });
  });

  describe('cancelarSuscripcion', () => {
    it('debería cancelar suscripción activa', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: true,
        tipo_suscripcion: 'mensual',
        update: vi.fn().mockResolvedValue(true)
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await cancelarSuscripcion(req, res);

      expect(mockUsuario.update).toHaveBeenCalledWith({
        es_premium: false,
        tipo_suscripcion: null,
        fecha_fin_premium: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debería rechazar si no hay suscripción activa', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: false
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await cancelarSuscripcion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes una suscripción activa.'
      });
    });
  });

  describe('verificarMostrarAnuncio', () => {
    it('debería no mostrar anuncio para usuario premium', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: true
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await verificarMostrarAnuncio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mostrar_anuncio: false,
        es_premium: true
      });
    });

    it('debería mostrar anuncio para usuario no premium (primera vez)', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: false,
        ultimo_anuncio_visto: null,
        update: vi.fn().mockResolvedValue(true)
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await verificarMostrarAnuncio(req, res);

      expect(mockUsuario.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mostrar_anuncio: true,
          es_premium: false
        })
      );
    });

    it('debería no mostrar anuncio si vio uno recientemente', async () => {
      const mockUsuario = {
        id: 1,
        es_premium: false,
        ultimo_anuncio_visto: new Date(),
        update: vi.fn().mockResolvedValue(true)
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);

      await verificarMostrarAnuncio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mostrar_anuncio: false,
          es_premium: false
        })
      );
    });
  });
});