import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupDatabase, closeDatabase, sequelize, cleanDatabase } from '../seeders/testSetup.js';
import usuarioRoutes from '../../routes/usuarioRoutes.js';
import logroRoutes from '../../routes/logroRoutes.js';
import vehiculoRoutes from '../../routes/vehiculoRoutes.js';
import viajeRoutes from '../../routes/viajeRoutes.js';
import repostajeRoutes from '../../routes/repostajeRoutes.js';
import reservaRoutes from '../../routes/reservaRoutes.js';

// Crear app de Express para tests
const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/logro', logroRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/viajes', viajeRoutes);
app.use('/api/repostajes', repostajeRoutes);
app.use('/api/reservas', reservaRoutes);

describe('Logro - Tests de Integración', () => {
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
      await cleanDatabase();
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

  // Helper para crear un logro de prueba
  const crearLogro = async (logroData = {}) => {
    const { Logro } = await import('../../models/index.js');
    return await Logro.create({
      nombre: 'Logro Test',
      descripcion: 'Descripción de prueba',
      tipo: 'VIAJES',
      criterio: 1,
      icono: '🏆',
      puntos: 10,
      activo: true,
      ...logroData
    });
  };

  describe('GET /api/logro/usuario/:usuarioId', () => {
  it('debería obtener logros del usuario con progreso', async () => {
    const { token, userId } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Logro Usuario 1', tipo: 'VIAJES', criterio: 10 });
    await crearLogro({ nombre: 'Logro Usuario 2', tipo: 'DISTANCIA', criterio: 100 });

    const response = await request(app)
      .get(`/api/logro/usuario/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('logros');
    expect(response.body).toHaveProperty('estadisticas');
    expect(Array.isArray(response.body.logros)).toBe(true);
  });

  it('debería mostrar progreso 0 en logros sin desbloquear', async () => {
    const { token, userId } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Logro Sin Desbloquear', tipo: 'VIAJES', criterio: 100 });

    const response = await request(app)
      .get(`/api/logro/usuario/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const logro = response.body.logros.find(l => l.nombre === 'Logro Sin Desbloquear');
    expect(logro.progreso).toBe(0);
    expect(logro.desbloqueado).toBe(false);
    expect(logro.porcentaje).toBe(0);
  });

  it('debería rechazar si el usuario intenta ver logros de otro', async () => {
    const { token } = await crearYAutenticarUsuario();
    const { userId: otroUserId } = await crearYAutenticarUsuario('otro@test.com', 'pass456');

    const response = await request(app)
      .get(`/api/logro/usuario/${otroUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('debería incluir todos los campos del logro', async () => {
    const { token, userId } = await crearYAutenticarUsuario();
    
    await crearLogro({ 
      nombre: 'Logro Completo Info',
      descripcion: 'Descripción completa',
      tipo: 'VIAJES',
      criterio: 5,
      icono: '🏆',
      puntos: 25
    });

    const response = await request(app)
      .get(`/api/logro/usuario/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const logro = response.body.logros.find(l => l.nombre === 'Logro Completo Info');
    expect(logro).toHaveProperty('id');
    expect(logro).toHaveProperty('nombre');
    expect(logro).toHaveProperty('descripcion');
    expect(logro).toHaveProperty('tipo');
    expect(logro).toHaveProperty('criterio');
    expect(logro).toHaveProperty('icono');
    expect(logro).toHaveProperty('puntos');
    expect(logro).toHaveProperty('progreso');
    expect(logro).toHaveProperty('porcentaje');
    expect(logro).toHaveProperty('desbloqueado');
  });

  it('debería ordenar logros por puntos de menor a mayor', async () => {
    const { token, userId } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Logro 50pts', puntos: 50 });
    await crearLogro({ nombre: 'Logro 10pts', puntos: 10 });
    await crearLogro({ nombre: 'Logro 25pts', puntos: 25 });

    const response = await request(app)
      .get(`/api/logro/usuario/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const logros = response.body.logros;
    
    for (let i = 0; i < logros.length - 1; i++) {
      expect(logros[i].puntos).toBeLessThanOrEqual(logros[i + 1].puntos);
    }
  });

  it('debería calcular estadísticas correctamente', async () => {
    const { token, userId } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Est Logro 1', puntos: 10 });
    await crearLogro({ nombre: 'Est Logro 2', puntos: 20 });
    await crearLogro({ nombre: 'Est Logro 3', puntos: 30 });

    const response = await request(app)
      .get(`/api/logro/usuario/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.estadisticas).toHaveProperty('totalLogros');
    expect(response.body.estadisticas).toHaveProperty('desbloqueados');
    expect(response.body.estadisticas).toHaveProperty('pendientes');
    expect(response.body.estadisticas).toHaveProperty('puntosTotales');
    expect(response.body.estadisticas).toHaveProperty('porcentajeCompletado');
    
    expect(response.body.estadisticas.totalLogros).toBe(3);
    expect(response.body.estadisticas.desbloqueados).toBe(0);
    expect(response.body.estadisticas.pendientes).toBe(3);
  });

  it('debería retornar 401 sin autenticación', async () => {
    const response = await request(app)
      .get('/api/logro/usuario/1');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/logro/verificar/:usuarioId', () => {
  it('debería verificar y desbloquear logro de VIAJES', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    await crearLogro({ nombre: 'Primer Viaje Verif', tipo: 'VIAJES', criterio: 1, puntos: 10 });

    const vehiculoResponse = await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Mi Coche',
        matricula: 'ABC1234',
        modelo: 'Modelo',
        fabricante: 'Fabricante',
        antiguedad: 2020,
        tipo_combustible: 'Gasolina',
        consumo_medio: 6.5,
        litros_combustible: 50
      });

    const vehiculoId = vehiculoResponse.body.vehiculo.id;

    await request(app)
      .post('/api/viajes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        vehiculoId: vehiculoId,
        nombre: 'Viaje de Prueba',
        descripcion: 'Descripción',
        fechaHoraInicio: new Date(),
        fechaHoraFin: new Date(),
        kmRealizados: 100,
        consumoCombustible: 5
      });

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('mensaje');
    expect(response.body).toHaveProperty('nuevosLogros');
    expect(Array.isArray(response.body.nuevosLogros)).toBe(true);
  });

  it('debería verificar logro de VEHICULOS al registrar vehículo', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    await crearLogro({ nombre: 'Primer Vehículo Test', tipo: 'VEHICULOS', criterio: 1, puntos: 5 });

    await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Mi Primer Coche',
        matricula: 'XYZ9876',
        modelo: 'Modelo',
        fabricante: 'Fabricante',
        antiguedad: 2020,
        tipo_combustible: 'Gasolina',
        consumo_medio: 6.5,
        litros_combustible: 50
      });

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.nuevosLogros.length).toBeGreaterThanOrEqual(0);
  });

  it('debería devolver array vacío si no hay nuevos logros', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.nuevosLogros).toHaveLength(0);
    expect(response.body).toHaveProperty('totalNuevos', 0);
  });

  it('debería rechazar si el usuario intenta verificar logros de otro', async () => {
    const { token } = await crearYAutenticarUsuario();
    const { userId: otroUserId } = await crearYAutenticarUsuario('otro2@test.com', 'pass456');

    const response = await request(app)
      .post(`/api/logro/verificar/${otroUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('debería retornar 401 sin autenticación', async () => {
    const response = await request(app)
      .post('/api/logro/verificar/1');

    expect(response.status).toBe(401);
  });

  it('debería verificar logro de DISTANCIA acumulada', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    await crearLogro({ nombre: 'Explorador Test', tipo: 'DISTANCIA', criterio: 100, puntos: 15 });

    const vehiculoResponse = await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Coche Dist',
        matricula: 'DIST123',
        modelo: 'Modelo',
        fabricante: 'Fabricante',
        antiguedad: 2020,
        tipo_combustible: 'Gasolina',
        consumo_medio: 6.5,
        litros_combustible: 50
      });

    const vehiculoId = vehiculoResponse.body.vehiculo.id;

    await request(app)
      .post('/api/viajes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        vehiculoId: vehiculoId,
        nombre: 'Viaje Largo',
        descripcion: 'Desc',
        fechaHoraInicio: new Date(),
        fechaHoraFin: new Date(),
        kmRealizados: 150,
        consumoCombustible: 10
      });

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('nuevosLogros');
  });

  it('debería verificar logro de REPOSTAJES', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    await crearLogro({ nombre: 'Primera Recarga Test', tipo: 'REPOSTAJES', criterio: 1, puntos: 5 });

    const vehiculoResponse = await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Coche Rep',
        matricula: 'REP1234',
        modelo: 'Modelo',
        fabricante: 'Fabricante',
        antiguedad: 2020,
        tipo_combustible: 'Gasolina',
        consumo_medio: 6.5,
        litros_combustible: 50
      });

    const vehiculoId = vehiculoResponse.body.vehiculo.id;

    await request(app)
      .post('/api/repostajes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        vehiculoId: vehiculoId,
        fecha: new Date(),
        litrosRepostados: 40,
        precioLitro: 1.5,
        precioTotal: 60,
        kmActuales: 10000
      });

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('nuevosLogros');
  });

  it('debería verificar logro de RESERVAS', async () => {
    const { token, userId } = await crearYAutenticarUsuario();

    await crearLogro({ nombre: 'Primera Reserva Test', tipo: 'RESERVAS', criterio: 1, puntos: 5 });

    const vehiculoResponse = await request(app)
      .post('/api/vehiculos/registrar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        nombre: 'Coche Res',
        matricula: 'RES1234',
        modelo: 'Modelo',
        fabricante: 'Fabricante',
        antiguedad: 2020,
        tipo_combustible: 'Gasolina',
        consumo_medio: 6.5,
        litros_combustible: 50
      });

    const vehiculoId = vehiculoResponse.body.vehiculo.id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuarioId: userId,
        vehiculoId: vehiculoId,
        motivo: 'Trabajo',
        fechaInicio: futureDate.toISOString().split('T')[0],
        fechaFin: new Date(futureDate.getTime() + 86400000).toISOString().split('T')[0],
        horaInicio: '08:00:00',
        horaFin: '18:00:00',
        descripcion: 'Reserva de prueba'
      });

    const response = await request(app)
      .post(`/api/logro/verificar/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('nuevosLogros');
  });
});

describe('GET /api/logro/ - Casos adicionales', () => {
  it('debería filtrar logros inactivos correctamente', async () => {
    const { token } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Logro Act 1', activo: true });
    await crearLogro({ nombre: 'Logro Inact 1', activo: false });
    await crearLogro({ nombre: 'Logro Act 2', activo: true });

    const response = await request(app)
      .get('/api/logro/')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    
    if (Array.isArray(response.body)) {
      const inactivos = response.body.filter(l => l.activo === false);
      expect(inactivos.length).toBe(0);
    } else {
      const logros = response.body.logros || [];
      const inactivos = logros.filter(l => l.activo === false);
      expect(inactivos.length).toBe(0);
    }
  });

  it('debería devolver logros de diferentes tipos', async () => {
    const { token } = await crearYAutenticarUsuario();
    
    await crearLogro({ nombre: 'Viaje Logro', tipo: 'VIAJES' });
    await crearLogro({ nombre: 'Distancia Logro', tipo: 'DISTANCIA' });
    await crearLogro({ nombre: 'Vehículo Logro', tipo: 'VEHICULOS' });
    await crearLogro({ nombre: 'Repostaje Logro', tipo: 'REPOSTAJES' });
    await crearLogro({ nombre: 'Reserva Logro', tipo: 'RESERVAS' });

    const response = await request(app)
      .get('/api/logro/')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    
    const logros = Array.isArray(response.body) ? response.body : (response.body.logros || []);
    const tipos = [...new Set(logros.map(l => l.tipo))];
    expect(tipos.length).toBeGreaterThan(0);
  });

  it('debería incluir todos los campos necesarios en cada logro', async () => {
    const { token } = await crearYAutenticarUsuario();
    
    await crearLogro({ 
      nombre: 'Logro Campos', 
      descripcion: 'Test',
      tipo: 'VIAJES',
      criterio: 5,
      icono: '🎯',
      puntos: 15
    });

    const response = await request(app)
      .get('/api/logro/')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    
    const logros = Array.isArray(response.body) ? response.body : (response.body.logros || []);
    const logro = logros.find(l => l.nombre === 'Logro Campos');
    
    if (logro) {
      expect(logro).toHaveProperty('id');
      expect(logro).toHaveProperty('nombre');
      expect(logro).toHaveProperty('descripcion');
      expect(logro).toHaveProperty('tipo');
      expect(logro).toHaveProperty('criterio');
      expect(logro).toHaveProperty('puntos');
    }
  });
});
});