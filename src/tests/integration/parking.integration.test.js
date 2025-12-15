import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupDatabase, closeDatabase, sequelize } from '../seeders/testSetup.js';
import usuarioRoutes from '../../routes/usuarioRoutes.js';
import parkingRoutes from '../../routes/parkingRoutes.js';

// Crear app de Express para tests
const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/parkings', parkingRoutes);

describe('Parking - Tests de Integración', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  afterEach(async () => {
    try {
      await sequelize.sync({ force: true });
    } catch (error) {
      console.error('Error limpiando:', error.message);
    }
  });

  // Helper para crear y autenticar usuario
  const crearYAutenticarUsuario = async (email = 'test@example.com', password = 'password123') => {
    await request(app)
      .post('/api/usuarios/sign-up')
      .send({
        nombre: 'Usuario Test',
        email,
        contraseña: password,
        fecha_nacimiento: '2000-01-01'
      });

    const loginResponse = await request(app)
      .post('/api/usuarios/sign-in')
      .send({
        email,
        contraseña: password
      });

    return {
      token: loginResponse.body.token,
      userId: loginResponse.body.userId
    };
  };

  describe('POST /api/parkings/crear', () => {
    it('debería crear un parking exitosamente', async () => {
      const { token, userId } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Centro',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Cerca del trabajo'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Parking creado exitosamente.');
      expect(response.body.parking).toHaveProperty('nombre', 'Parking Centro');
      expect(response.body.parking).toHaveProperty('ubicacion');
      expect(response.body.parking.ubicacion).toEqual({ lat: 40.4168, lng: -3.7038 });
      expect(response.body.parking).toHaveProperty('notas', 'Cerca del trabajo');
    });

    it('debería crear un parking sin notas', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Sin Notas',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      expect(response.status).toBe(201);
      expect(response.body.parking).toHaveProperty('notas', null);
    });

    it('debería rechazar si falta token de autenticación', async () => {
      const response = await request(app)
        .post('/api/parkings/crear')
        .send({
          nombre: 'Parking Centro',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      expect(response.status).toBe(401);
    });

    it('debería rechazar si faltan campos obligatorios', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Centro'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Faltan campos obligatorios (nombre y ubicación).');
    });

    it('debería rechazar ubicación sin latitud', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Centro',
          ubicacion: { lng: -3.7038 }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'La ubicación debe contener latitud (lat) y longitud (lng).');
    });

    it('debería rechazar ubicación sin longitud', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Centro',
          ubicacion: { lat: 40.4168 }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'La ubicación debe contener latitud (lat) y longitud (lng).');
    });

    it('debería rechazar coordenadas no numéricas', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Centro',
          ubicacion: { lat: '40.4168', lng: -3.7038 }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Las coordenadas deben ser números.');
    });
  });

  describe('GET /api/parkings/usuario/:usuarioId', () => {
    it('debería obtener los parkings de un usuario', async () => {
      const { token, userId } = await crearYAutenticarUsuario();

      // Crear parkings
      await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking 1',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Notas 1'
        });

      await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking 2',
          ubicacion: { lat: 41.3851, lng: 2.1734 }
        });

      const response = await request(app)
        .get(`/api/parkings/usuario/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('parkings');
      expect(response.body.parkings).toHaveLength(2);
      expect(response.body.parkings[0]).toHaveProperty('nombre');
      expect(response.body.parkings[0]).toHaveProperty('ubicacion');
    });

    it('debería devolver array vacío si no hay parkings', async () => {
      const { token, userId } = await crearYAutenticarUsuario();

      const response = await request(app)
        .get(`/api/parkings/usuario/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.parkings).toHaveLength(0);
    });

    it('debería rechazar si el usuario intenta ver parkings de otro', async () => {
      const { token: token1 } = await crearYAutenticarUsuario('user1@example.com');
      const { userId: userId2 } = await crearYAutenticarUsuario('user2@example.com', 'password456');

      const response = await request(app)
        .get(`/api/parkings/usuario/${userId2}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'No tienes permisos para ver los parkings de otro usuario.');
    });

    it('debería rechazar si falta token de autenticación', async () => {
      const response = await request(app)
        .get('/api/parkings/usuario/1');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/parkings/:parkingId', () => {
    it('debería obtener un parking por ID', async () => {
      const { token, userId } = await crearYAutenticarUsuario();

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Test',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Test notas'
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .get(`/api/parkings/${parkingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.parking).toHaveProperty('nombre', 'Parking Test');
      expect(response.body.parking).toHaveProperty('notas', 'Test notas');
    });

    it('debería rechazar si el parking no existe', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .get('/api/parkings/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Parking no encontrado.');
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      const { token: token1 } = await crearYAutenticarUsuario('user1@example.com');
      const { token: token2 } = await crearYAutenticarUsuario('user2@example.com', 'password456');

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nombre: 'Parking User1',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .get(`/api/parkings/${parkingId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'No tienes permisos para ver este parking.');
    });
  });

  describe('PUT /api/parkings/actualizar/:parkingId', () => {
    it('debería actualizar un parking exitosamente', async () => {
      const { token } = await crearYAutenticarUsuario();

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Original',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Notas originales'
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .put(`/api/parkings/actualizar/${parkingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Actualizado',
          ubicacion: { lat: 41.3851, lng: 2.1734 },
          notas: 'Notas actualizadas'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Parking actualizado correctamente.');
      expect(response.body.parking).toHaveProperty('nombre', 'Parking Actualizado');
      expect(response.body.parking.ubicacion).toEqual({ lat: 41.3851, lng: 2.1734 });
      expect(response.body.parking).toHaveProperty('notas', 'Notas actualizadas');
    });

    it('debería actualizar solo el nombre', async () => {
      const { token } = await crearYAutenticarUsuario();

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Original',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .put(`/api/parkings/actualizar/${parkingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Solo Nombre Actualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body.parking).toHaveProperty('nombre', 'Solo Nombre Actualizado');
    });

    it('debería rechazar si el parking no existe', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .put('/api/parkings/actualizar/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nuevo Nombre'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Parking no encontrado.');
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      const { token: token1 } = await crearYAutenticarUsuario('user1@example.com');
      const { token: token2 } = await crearYAutenticarUsuario('user2@example.com', 'password456');

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nombre: 'Parking User1',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .put(`/api/parkings/actualizar/${parkingId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          nombre: 'Intento Hackeo'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'No tienes permisos para editar este parking.');
    });

    it('debería rechazar ubicación inválida', async () => {
      const { token } = await crearYAutenticarUsuario();

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Test',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .put(`/api/parkings/actualizar/${parkingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ubicacion: { lng: -3.7038 }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'La ubicación debe contener latitud (lat) y longitud (lng).');
    });
  });

  describe('DELETE /api/parkings/eliminar/:parkingId', () => {
    it('debería eliminar un parking exitosamente', async () => {
      const { token } = await crearYAutenticarUsuario();

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking a Eliminar',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .delete(`/api/parkings/eliminar/${parkingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Parking eliminado correctamente.');

      // Verificar que ya no existe
      const getResponse = await request(app)
        .get(`/api/parkings/${parkingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('debería rechazar si el parking no existe', async () => {
      const { token } = await crearYAutenticarUsuario();

      const response = await request(app)
        .delete('/api/parkings/eliminar/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Parking no encontrado.');
    });

    it('debería rechazar si el parking no pertenece al usuario', async () => {
      const { token: token1 } = await crearYAutenticarUsuario('user1@example.com');
      const { token: token2 } = await crearYAutenticarUsuario('user2@example.com', 'password456');

      const createResponse = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nombre: 'Parking User1',
          ubicacion: { lat: 40.4168, lng: -3.7038 }
        });

      const parkingId = createResponse.body.parking.id;

      const response = await request(app)
        .delete(`/api/parkings/eliminar/${parkingId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'No tienes permisos para eliminar este parking.');
    });

    it('debería rechazar si falta token de autenticación', async () => {
      const response = await request(app)
        .delete('/api/parkings/eliminar/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Flujo completo de Parking', () => {
    it('debería crear, listar, actualizar y eliminar parkings', async () => {
      const { token, userId } = await crearYAutenticarUsuario();

      // 1. Crear múltiples parkings
      const parking1 = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Casa',
          ubicacion: { lat: 40.4168, lng: -3.7038 },
          notas: 'Parking de casa'
        });

      const parking2 = await request(app)
        .post('/api/parkings/crear')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Trabajo',
          ubicacion: { lat: 41.3851, lng: 2.1734 },
          notas: 'Parking del trabajo'
        });

      expect(parking1.status).toBe(201);
      expect(parking2.status).toBe(201);

      // 2. Listar parkings
      const listResponse = await request(app)
        .get(`/api/parkings/usuario/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.parkings).toHaveLength(2);

      // 3. Actualizar un parking
      const updateResponse = await request(app)
        .put(`/api/parkings/actualizar/${parking1.body.parking.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Parking Casa Actualizado',
          notas: 'Nueva descripción'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.parking.nombre).toBe('Parking Casa Actualizado');

      // 4. Eliminar un parking
      const deleteResponse = await request(app)
        .delete(`/api/parkings/eliminar/${parking2.body.parking.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);

      // 5. Verificar que solo queda un parking
      const finalListResponse = await request(app)
        .get(`/api/parkings/usuario/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(finalListResponse.status).toBe(200);
      expect(finalListResponse.body.parkings).toHaveLength(1);
      expect(finalListResponse.body.parkings[0].nombre).toBe('Parking Casa Actualizado');
    });
  });
});