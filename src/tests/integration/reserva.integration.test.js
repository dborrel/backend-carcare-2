import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupDatabase, closeDatabase, sequelize } from '../seeders/testSetup.js';
import usuarioRoutes from '../../routes/usuarioRoutes.js';
import vehiculoRoutes from '../../routes/vehiculoRoutes.js';
import reservaRoutes from '../../routes/reservaRoutes.js';

import '../../models/Associations.js';

// App de pruebas
const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/reservas', reservaRoutes);

describe('Reserva - Tests de Integración', () => {
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
      console.error('Error limpiando DB en afterEach:', error.message);
    }
  });

  // Helpers
  const crearYAutenticarUsuario = async (email, password = 'password123') => {
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

  const crearVehiculo = async (token, userId, matricula = '1234ABC') => {
    const response = await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Mi Tesla',
        matricula,
        modelo: 'Model S',
        fabricante: 'Tesla',
        antiguedad: 2,
        tipo_combustible: 'Eléctrico',
        litros_combustible: 0,
        consumo_medio: 0
      });

    return response.body.vehiculo;
  };

  describe('POST /api/reservas', () => {
    it('debería crear una reserva correctamente', async () => {
      const { token, userId } = await crearYAutenticarUsuario('owner@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const response = await request(app)
        .post('/api/reservas') // Cambiado de /registrar a /
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-11-10',
          fechaFinal: '2026-11-11',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '18:00:00',
          notas: 'Viaje'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('mensaje', 'Reserva creada exitosamente');
      expect(response.body.reserva).toHaveProperty('UsuarioId', userId);
      expect(response.body.reserva).toHaveProperty('VehiculoId', vehiculo.id);
    });

    it('debería rechazar sin token', async () => {
      const response = await request(app)
        .post('/api/reservas') // Cambiado
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-11-10',
          fechaFinal: '2026-11-11',
          vehiculoId: 1,
          horaInicio: '08:00:00',
          horaFin: '18:00:00'
        });

      expect(response.status).toBe(401);
    });

    it('debería rechazar si la fecha final es anterior', async () => {
      const { token, userId } = await crearYAutenticarUsuario('owner2@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const response = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-11-11',
          fechaFinal: '2026-11-10',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '18:00:00'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/fecha de fin/i);
    });

    it('debería rechazar reservas solapadas para el mismo vehículo', async () => {
      const { token, userId } = await crearYAutenticarUsuario('owner3@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const r1 = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-01',
          fechaFinal: '2026-12-01',
          vehiculoId: vehiculo.id,
          horaInicio: '09:00:00',
          horaFin: '12:00:00'
        });

      expect(r1.status).toBe(201);

      const r2 = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'PERSONAL',
          fechaInicio: '2026-12-01',
          fechaFinal: '2026-12-01',
          vehiculoId: vehiculo.id,
          horaInicio: '11:00:00',
          horaFin: '13:00:00'
        });

      expect(r2.status).toBe(400);
      expect(r2.body).toHaveProperty('error');
      expect(r2.body.error).toMatch(/ya está reservado/i);
    });

    it('debería rechazar reservas con fecha de inicio en el pasado', async () => {
      const { token, userId } = await crearYAutenticarUsuario('owner4@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const fechaAyer = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: fechaAyer,
          fechaFinal: fechaAyer,
          vehiculoId: vehiculo.id,
          horaInicio: '09:00:00',
          horaFin: '10:00:00'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/pasado/i);
    });
  });

  describe('GET /api/reservas (listar)', () => {
    it('debería listar las reservas del usuario', async () => {
      const { token, userId } = await crearYAutenticarUsuario('listowner@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-10',
          fechaFinal: '2026-12-10',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '09:00:00'
        });

      const response = await request(app)
        .get('/api/reservas')
        .set('Authorization', `Bearer ${token}`);

      // Debug temporal
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reservas');
      expect(Array.isArray(response.body.reservas)).toBe(true);
      expect(response.body.reservas.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/reservas/:id (actualizar) y DELETE /api/reservas/:id', () => {
    it('debería actualizar una reserva por su propietario', async () => {
      const { token, userId } = await crearYAutenticarUsuario('updateowner@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const createResp = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-20',
          fechaFinal: '2026-12-20',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '10:00:00'
        });

      const reservaId = createResp.body.reserva.id;

      const updateResp = await request(app)
        .put(`/api/reservas/${reservaId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'PERSONAL',
          horaInicio: '09:00:00',
          horaFin: '11:00:00'
        });

      expect(updateResp.status).toBe(200);
      expect(updateResp.body).toHaveProperty('mensaje', 'Reserva actualizada exitosamente');
      expect(updateResp.body.reserva).toHaveProperty('motivo', 'PERSONAL');
    });

    it('no debería permitir actualizar si no eres propietario', async () => {
      const { token: ownerToken, userId: ownerId } = await crearYAutenticarUsuario('owner5@example.com');
      const { token: otherToken } = await crearYAutenticarUsuario('other@example.com');
      const vehiculo = await crearVehiculo(ownerToken, ownerId);

      const createResp = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-22',
          fechaFinal: '2026-12-22',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '10:00:00'
        });

      const reservaId = createResp.body.reserva.id;

      const updateResp = await request(app)
        .put(`/api/reservas/${reservaId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ motivo: 'PERSONAL' });

      expect(updateResp.status).toBe(403);
      expect(updateResp.body).toHaveProperty('error', 'No tienes permisos para modificar esta reserva.');
    });

    it('debería eliminar una reserva por su propietario', async () => {
      const { token, userId } = await crearYAutenticarUsuario('deleteowner@example.com');
      const vehiculo = await crearVehiculo(token, userId);

      const createResp = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-25',
          fechaFinal: '2026-12-25',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '10:00:00'
        });

      const reservaId = createResp.body.reserva.id;

      const deleteResp = await request(app)
        .delete(`/api/reservas/${reservaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResp.status).toBe(200);
      expect(deleteResp.body).toHaveProperty('mensaje', 'Reserva eliminada correctamente.');
    });

    it('no debería permitir eliminar si no eres propietario', async () => {
      const { token: ownerToken, userId: ownerId } = await crearYAutenticarUsuario('owner6@example.com');
      const { token: otherToken } = await crearYAutenticarUsuario('other2@example.com');
      const vehiculo = await crearVehiculo(ownerToken, ownerId);

      const createResp = await request(app)
        .post('/api/reservas') // Cambiado
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tipo: 'TRABAJO',
          fechaInicio: '2026-12-27',
          fechaFinal: '2026-12-27',
          vehiculoId: vehiculo.id,
          horaInicio: '08:00:00',
          horaFin: '10:00:00'
        });

      const reservaId = createResp.body.reserva.id;

      const deleteResp = await request(app)
        .delete(`/api/reservas/${reservaId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(deleteResp.status).toBe(403);
      expect(deleteResp.body).toHaveProperty('error', 'No tienes permisos para eliminar esta reserva.');
    });
  });
});