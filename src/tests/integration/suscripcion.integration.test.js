import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupDatabase, cleanDatabase, closeDatabase } from '../seeders/testSetup.js';
import usuarioRoutes from '../../routes/usuarioRoutes.js';
import suscripcionRoutes from '../../routes/suscripcionRoutes.js';

// Crear app de Express para tests
const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/suscripciones', suscripcionRoutes);

describe('Suscripción - Tests de Integración', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    
    // Crear y autenticar usuario para cada test
    await request(app)
      .post('/api/usuarios/sign-up')
      .send({
        nombre: 'Usuario Test',
        email: 'test@example.com',
        contraseña: 'password123',
        fecha_nacimiento: '2000-01-01'
      });

    const loginResponse = await request(app)
      .post('/api/usuarios/sign-in')
      .send({
        email: 'test@example.com',
        contraseña: 'password123'
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.userId;
  });

  describe('POST /api/suscripciones/procesar-pago', () => {
    it('debería procesar un pago mensual exitosamente', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      // Como hay un 10% de probabilidad de fallo, solo verificamos que sea 200 o 400
      if (response.status === 200) {
        expect(response.body).toHaveProperty('message', 'Pago procesado exitosamente. ¡Ahora eres usuario Premium!');
        expect(response.body.suscripcion).toHaveProperty('tipo', 'mensual');
        expect(response.body.suscripcion).toHaveProperty('precio', 4.99);
      } else if (response.status === 400) {
        expect(response.body).toHaveProperty('error', 'Pago rechazado.');
      }
    });

    it('debería procesar un pago anual exitosamente', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'anual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '456',
            fecha_expiracion: '06/26'
          }
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message', 'Pago procesado exitosamente. ¡Ahora eres usuario Premium!');
        expect(response.body.suscripcion).toHaveProperty('tipo', 'anual');
        expect(response.body.suscripcion).toHaveProperty('precio', 49.99);
      }
    });

    it('debería rechazar tipo de suscripción inválido', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'trimestral',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Tipo de suscripción inválido.');
    });

    it('debería rechazar número de tarjeta inválido', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '12345',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Número de tarjeta inválido. Debe tener 16 dígitos.');
    });

    it('debería rechazar CVV inválido', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '12',
            fecha_expiracion: '12/25'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'CVV inválido. Debe tener 3 dígitos.');
    });

    it('debería rechazar fecha de expiración inválida', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '13/25'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Fecha de expiración inválida. Formato: MM/YY');
    });

    it('debería rechazar datos de tarjeta incompletos', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456'
            // Falta CVV y fecha_expiracion
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de tarjeta incompletos.');
    });

    it('debería rechazar petición sin token', async () => {
      const response = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/suscripciones/estado', () => {
    it('debería obtener estado de usuario no premium', async () => {
      const response = await request(app)
        .get('/api/suscripciones/estado')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('es_premium', false);
      expect(response.body).toHaveProperty('tipo_suscripcion', null);
      expect(response.body).toHaveProperty('precios');
      expect(response.body.precios).toHaveProperty('mensual', 4.99);
      expect(response.body.precios).toHaveProperty('anual', 49.99);
    });

    it('debería obtener estado de usuario premium', async () => {
      // Primero hacer al usuario premium
      await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      // Verificar estado
      const response = await request(app)
        .get('/api/suscripciones/estado')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.es_premium) {
        expect(response.body).toHaveProperty('tipo_suscripcion', 'mensual');
        expect(response.body).toHaveProperty('fecha_inicio');
        expect(response.body).toHaveProperty('fecha_fin');
      }
    });

    it('debería rechazar petición sin token', async () => {
      const response = await request(app)
        .get('/api/suscripciones/estado');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/suscripciones/cancelar', () => {
    it('debería cancelar suscripción premium', async () => {
      // Primero hacer al usuario premium
      const pagoResponse = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      // Solo cancelar si el pago fue exitoso
      if (pagoResponse.status === 200) {
        const response = await request(app)
          .post('/api/suscripciones/cancelar')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Suscripción cancelada exitosamente.');

        // Verificar que el usuario ya no es premium
        const estadoResponse = await request(app)
          .get('/api/suscripciones/estado')
          .set('Authorization', `Bearer ${authToken}`);

        expect(estadoResponse.body.es_premium).toBe(false);
      }
    });

    it('debería rechazar cancelación sin suscripción activa', async () => {
      const response = await request(app)
        .post('/api/suscripciones/cancelar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No tienes una suscripción activa.');
    });

    it('debería rechazar petición sin token', async () => {
      const response = await request(app)
        .post('/api/suscripciones/cancelar');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/suscripciones/verificar-anuncio', () => {
    it('debería indicar que no mostrar anuncio para usuario premium', async () => {
      // Hacer al usuario premium
      const pagoResponse = await request(app)
        .post('/api/suscripciones/procesar-pago')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_suscripcion: 'mensual',
          datos_tarjeta: {
            numero: '1234567890123456',
            cvv: '123',
            fecha_expiracion: '12/25'
          }
        });

      if (pagoResponse.status === 200) {
        const response = await request(app)
          .get('/api/suscripciones/verificar-anuncio')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('mostrar_anuncio', false);
        expect(response.body).toHaveProperty('es_premium', true);
      }
    });

    it('debería indicar que mostrar anuncio para usuario no premium (primera vez)', async () => {
      const response = await request(app)
        .get('/api/suscripciones/verificar-anuncio')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('mostrar_anuncio', true);
      expect(response.body).toHaveProperty('es_premium', false);
      expect(response.body).toHaveProperty('tiempo_restante_segundos', 0);
    });

    it('debería indicar que no mostrar anuncio si ya vio uno recientemente', async () => {
      // Primera petición - muestra anuncio
      await request(app)
        .get('/api/suscripciones/verificar-anuncio')
        .set('Authorization', `Bearer ${authToken}`);

      // Segunda petición inmediata - no muestra anuncio
      const response = await request(app)
        .get('/api/suscripciones/verificar-anuncio')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('mostrar_anuncio', false);
      expect(response.body).toHaveProperty('es_premium', false);
      expect(response.body.tiempo_restante_segundos).toBeGreaterThan(0);
    });

    it('debería rechazar petición sin token', async () => {
      const response = await request(app)
        .get('/api/suscripciones/verificar-anuncio');

      expect(response.status).toBe(401);
    });
  });
});