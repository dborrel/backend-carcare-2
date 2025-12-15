import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  crearParking, 
  obtenerParkingsUsuario, 
  obtenerParkingPorId,
  actualizarParking, 
  eliminarParking 
} from '../../controllers/parkingController.js';

// Mock de los modelos
vi.mock('../../models/Parking.js', () => ({
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn()
  }
}));

vi.mock('../../models/index.js', () => ({
  Usuario: {
    findByPk: vi.fn()
  },
  Parking: {
    create: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn()
  }
}));

import Parking from '../../models/Parking.js';
import { Usuario } from '../../models/index.js';

describe('Parking Controller - Tests Unitarios', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      body: {},
      params: {},
      usuario: { id: 1 }
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('crearParking', () => {
    it('debería crear un parking exitosamente', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        notas: 'Cerca del trabajo'
      };

      const mockUsuario = { id: 1, nombre: 'Usuario Test' };
      const mockParking = {
        id: 1,
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        notas: 'Cerca del trabajo',
        usuarioId: 1
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);
      Parking.create.mockResolvedValue(mockParking);

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Parking creado exitosamente.',
          parking: mockParking
        })
      );
    });

    it('debería crear un parking sin notas', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 }
      };

      const mockUsuario = { id: 1 };
      const mockParking = {
        id: 1,
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        notas: null,
        usuarioId: 1
      };

      Usuario.findByPk.mockResolvedValue(mockUsuario);
      Parking.create.mockResolvedValue(mockParking);

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Parking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: null
        })
      );
    });

    it('debería rechazar si faltan campos obligatorios', async () => {
      req.body = {
        nombre: 'Parking Centro'
      };

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Faltan campos obligatorios (nombre y ubicación).'
      });
    });

    it('debería rechazar si falta el nombre', async () => {
      req.body = {
        ubicacion: { lat: 40.4168, lng: -3.7038 }
      };

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Faltan campos obligatorios (nombre y ubicación).'
      });
    });

    it('debería rechazar si la ubicación no tiene latitud', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lng: -3.7038 }
      };

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La ubicación debe contener latitud (lat) y longitud (lng).'
      });
    });

    it('debería rechazar si la ubicación no tiene longitud', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168 }
      };

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La ubicación debe contener latitud (lat) y longitud (lng).'
      });
    });

    it('debería rechazar si las coordenadas no son números', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: '40.4168', lng: -3.7038 }
      };

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Las coordenadas deben ser números.'
      });
    });

    it('debería rechazar si el usuario no existe', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 }
      };

      Usuario.findByPk.mockResolvedValue(null);

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado.'
      });
    });

    it('debería manejar errores en la creación', async () => {
      req.body = {
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 }
      };

      Usuario.findByPk.mockResolvedValue({ id: 1 });
      Parking.create.mockRejectedValue(new Error('Error de base de datos'));

      await crearParking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al crear el parking.'
        })
      );
    });
  });

  describe('obtenerParkingsUsuario', () => {
    it('debería obtener los parkings de un usuario', async () => {
      req.params = { usuarioId: '1' };
      req.usuario = { id: 1 };

      const mockUsuario = { id: 1 };
      const mockParkings = [
        {
          id: 1,
          nombre: 'Parking 1',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Notas 1',
          usuarioId: 1
        },
        {
          id: 2,
          nombre: 'Parking 2',
          ubicacion: { lat: 41.3851, lng: 2.1734 },
          notas: null,
          usuarioId: 1
        }
      ];

      Usuario.findByPk.mockResolvedValue(mockUsuario);
      Parking.findAll.mockResolvedValue(mockParkings);

      await obtenerParkingsUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ parkings: mockParkings });
    });

    it('debería rechazar si el usuario intenta ver parkings de otro', async () => {
      req.params = { usuarioId: '2' };
      req.usuario = { id: 1 };

      await obtenerParkingsUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para ver los parkings de otro usuario.'
      });
    });

    it('debería rechazar si el usuario no existe', async () => {
      req.params = { usuarioId: '1' };
      req.usuario = { id: 1 };

      Usuario.findByPk.mockResolvedValue(null);

      await obtenerParkingsUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado.'
      });
    });

    it('debería devolver array vacío si no hay parkings', async () => {
      req.params = { usuarioId: '1' };
      req.usuario = { id: 1 };

      Usuario.findByPk.mockResolvedValue({ id: 1 });
      Parking.findAll.mockResolvedValue([]);

      await obtenerParkingsUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ parkings: [] });
    });

    it('debería manejar errores en la consulta', async () => {
      req.params = { usuarioId: '1' };
      req.usuario = { id: 1 };

      Usuario.findByPk.mockResolvedValue({ id: 1 });
      Parking.findAll.mockRejectedValue(new Error('Error de base de datos'));

      await obtenerParkingsUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al obtener los parkings.'
        })
      );
    });
  });

  describe('obtenerParkingPorId', () => {
    it('debería obtener un parking por ID', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };

      const mockParking = {
        id: 1,
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        notas: 'Notas',
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await obtenerParkingPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ parking: mockParking });
    });

    it('debería rechazar si el parking no existe', async () => {
      req.params = { parkingId: '999' };
      req.usuario = { id: 1 };

      Parking.findByPk.mockResolvedValue(null);

      await obtenerParkingPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Parking no encontrado.'
      });
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 2 };

      const mockParking = {
        id: 1,
        nombre: 'Parking Centro',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await obtenerParkingPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para ver este parking.'
      });
    });

    it('debería manejar errores en la consulta', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };

      Parking.findByPk.mockRejectedValue(new Error('Error de base de datos'));

      await obtenerParkingPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al obtener el parking.'
        })
      );
    });
  });

  describe('actualizarParking', () => {
    it('debería actualizar un parking exitosamente', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };
      req.body = {
        nombre: 'Parking Actualizado',
        ubicacion: { lat: 41.3851, lng: 2.1734 },
        notas: 'Nuevas notas'
      };

      const mockParking = {
        id: 1,
        nombre: 'Parking Original',
        ubicacion: { lat: 40.4168, lng: -3.7038 },
        notas: 'Notas originales',
        usuarioId: 1,
        update: vi.fn().mockResolvedValue()
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(mockParking.update).toHaveBeenCalledWith({
        nombre: 'Parking Actualizado',
        ubicacion: { lat: 41.3851, lng: 2.1734 },
        notas: 'Nuevas notas'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Parking actualizado correctamente.'
        })
      );
    });

    it('debería actualizar solo el nombre', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };
      req.body = { nombre: 'Nuevo Nombre' };

      const mockParking = {
        id: 1,
        usuarioId: 1,
        update: vi.fn().mockResolvedValue()
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(mockParking.update).toHaveBeenCalledWith({
        nombre: 'Nuevo Nombre'
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debería rechazar si el parking no existe', async () => {
      req.params = { parkingId: '999' };
      req.usuario = { id: 1 };
      req.body = { nombre: 'Nuevo Nombre' };

      Parking.findByPk.mockResolvedValue(null);

      await actualizarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Parking no encontrado.'
      });
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 2 };
      req.body = { nombre: 'Nuevo Nombre' };

      const mockParking = {
        id: 1,
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para editar este parking.'
      });
    });

    it('debería rechazar ubicación sin latitud', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };
      req.body = {
        ubicacion: { lng: -3.7038 }
      };

      const mockParking = {
        id: 1,
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La ubicación debe contener latitud (lat) y longitud (lng).'
      });
    });

    it('debería rechazar coordenadas no numéricas', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };
      req.body = {
        ubicacion: { lat: '40.4168', lng: -3.7038 }
      };

      const mockParking = {
        id: 1,
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Las coordenadas deben ser números.'
      });
    });

    it('debería manejar errores en la actualización', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };
      req.body = { nombre: 'Nuevo Nombre' };

      const mockParking = {
        id: 1,
        usuarioId: 1,
        update: vi.fn().mockRejectedValue(new Error('Error de base de datos'))
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await actualizarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al actualizar el parking.'
        })
      );
    });
  });

  describe('eliminarParking', () => {
    it('debería eliminar un parking exitosamente', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };

      const mockParking = {
        id: 1,
        usuarioId: 1,
        destroy: vi.fn().mockResolvedValue()
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await eliminarParking(req, res);

      expect(mockParking.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Parking eliminado correctamente.'
      });
    });

    it('debería rechazar si el parking no existe', async () => {
      req.params = { parkingId: '999' };
      req.usuario = { id: 1 };

      Parking.findByPk.mockResolvedValue(null);

      await eliminarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Parking no encontrado.'
      });
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 2 };

      const mockParking = {
        id: 1,
        usuarioId: 1
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await eliminarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permisos para eliminar este parking.'
      });
    });

    it('debería manejar errores en la eliminación', async () => {
      req.params = { parkingId: '1' };
      req.usuario = { id: 1 };

      const mockParking = {
        id: 1,
        usuarioId: 1,
        destroy: vi.fn().mockRejectedValue(new Error('Error de base de datos'))
      };

      Parking.findByPk.mockResolvedValue(mockParking);

      await eliminarParking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al eliminar el parking.'
        })
      );
    });
  });
});