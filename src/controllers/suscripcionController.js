import Usuario from '../models/Usuario.js';

// Precios simulados (en euros)
const PRECIOS = {
  mensual: 4.99,
  anual: 49.99
};

// Función para validar fecha de expiración
const validarFechaExpiracion = (fecha) => {
  // Validar formato MM/YY
  if (!/^\d{2}\/\d{2}$/.test(fecha)) {
    return false;
  }

  const [mes, año] = fecha.split('/').map(Number);
  
  // Validar que el mes esté entre 01 y 12
  if (mes < 1 || mes > 12) {
    return false;
  }

  // Validar que la fecha no haya expirado
  const añoActual = new Date().getFullYear() % 100; // Últimos 2 dígitos del año
  const mesActual = new Date().getMonth() + 1;

  if (año < añoActual || (año === añoActual && mes < mesActual)) {
    return false;
  }

  return true;
};

// Simular procesamiento de pago
export const procesarPagoSimulado = async (req, res) => {
  try {
    const { tipo_suscripcion, datos_tarjeta } = req.body;
    const usuarioId = req.usuario.id;

    // Validar tipo de suscripción
    if (!['mensual', 'anual'].includes(tipo_suscripcion)) {
      return res.status(400).json({ error: 'Tipo de suscripción inválido.' });
    }

    // Validar datos de tarjeta simulados (solo validación básica de formato)
    if (!datos_tarjeta || !datos_tarjeta.numero || !datos_tarjeta.cvv || !datos_tarjeta.fecha_expiracion) {
      return res.status(400).json({ error: 'Datos de tarjeta incompletos.' });
    }

    // Validar formato de número de tarjeta (16 dígitos)
    if (!/^\d{16}$/.test(datos_tarjeta.numero.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Número de tarjeta inválido. Debe tener 16 dígitos.' });
    }

    // Validar CVV (3 dígitos)
    if (!/^\d{3}$/.test(datos_tarjeta.cvv)) {
      return res.status(400).json({ error: 'CVV inválido. Debe tener 3 dígitos.' });
    }

    // Validar fecha de expiración
    if (!validarFechaExpiracion(datos_tarjeta.fecha_expiracion)) {
      return res.status(400).json({ error: 'Fecha de expiración inválida. Formato: MM/YY' });
    }

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Simular un 10% de probabilidad de fallo en el pago
    const pagoExitoso = Math.random() > 0.1;

    if (!pagoExitoso) {
      return res.status(400).json({ 
        error: 'Pago rechazado.',
        mensaje: 'La transacción fue rechazada. Por favor, verifica los datos de tu tarjeta.' 
      });
    }

    // Calcular fechas de suscripción
    const fechaInicio = new Date();
    const fechaFin = new Date();
    
    if (tipo_suscripcion === 'mensual') {
      fechaFin.setMonth(fechaFin.getMonth() + 1);
    } else {
      fechaFin.setFullYear(fechaFin.getFullYear() + 1);
    }

    // Actualizar usuario a premium
    await usuario.update({
      es_premium: true,
      tipo_suscripcion: tipo_suscripcion,
      fecha_inicio_premium: fechaInicio,
      fecha_fin_premium: fechaFin,
    });

    res.status(200).json({ 
      message: 'Pago procesado exitosamente. ¡Ahora eres usuario Premium!',
      suscripcion: {
        tipo: tipo_suscripcion,
        precio: PRECIOS[tipo_suscripcion],
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      }
    });
  } catch (error) {
    console.error('Error al procesar pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago.', detalles: error.message });
  }
};

// Obtener estado de suscripción del usuario
export const obtenerEstadoSuscripcion = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'nombre', 'email', 'es_premium', 'tipo_suscripcion', 'fecha_inicio_premium', 'fecha_fin_premium']
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Verificar si la suscripción ha expirado
    if (usuario.es_premium && usuario.fecha_fin_premium) {
      const ahora = new Date();
      if (new Date(usuario.fecha_fin_premium) < ahora) {
        await usuario.update({
          es_premium: false,
          tipo_suscripcion: null
        });
        usuario.es_premium = false;
        usuario.tipo_suscripcion = null;
      }
    }

    res.status(200).json({
      es_premium: usuario.es_premium,
      tipo_suscripcion: usuario.tipo_suscripcion,
      fecha_inicio: usuario.fecha_inicio_premium,
      fecha_fin: usuario.fecha_fin_premium,
      precios: PRECIOS
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estado de suscripción.', detalles: error.message });
  }
};

// Cancelar suscripción premium
export const cancelarSuscripcion = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (!usuario.es_premium) {
      return res.status(400).json({ error: 'No tienes una suscripción activa.' });
    }

    await usuario.update({
      es_premium: false,
      tipo_suscripcion: null,
      fecha_fin_premium: new Date()
    });

    res.status(200).json({ message: 'Suscripción cancelada exitosamente.' });
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    res.status(500).json({ error: 'Error al cancelar suscripción.', detalles: error.message });
  }
};

// Verificar si debe mostrar anuncio
export const verificarMostrarAnuncio = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Si es premium, no mostrar anuncios
    if (usuario.es_premium) {
      return res.status(200).json({ mostrar_anuncio: false, es_premium: true });
    }

    // Configurar tiempo entre anuncios (3 minutos para desarrollo, ajustable)
    const TIEMPO_ENTRE_ANUNCIOS = 3 * 60 * 1000; // 3 minutos en milisegundos
    const ahora = new Date();
    const ultimoAnuncio = usuario.ultimo_anuncio_visto;

    let mostrar_anuncio = false;

    if (!ultimoAnuncio || (ahora - new Date(ultimoAnuncio)) >= TIEMPO_ENTRE_ANUNCIOS) {
      mostrar_anuncio = true;
      await usuario.update({ ultimo_anuncio_visto: ahora });
    }

    const tiempoRestante = ultimoAnuncio 
      ? Math.max(0, TIEMPO_ENTRE_ANUNCIOS - (ahora - new Date(ultimoAnuncio)))
      : 0;

    res.status(200).json({ 
      mostrar_anuncio,
      es_premium: false,
      tiempo_restante_segundos: Math.floor(tiempoRestante / 1000)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar anuncios.', detalles: error.message });
  }
};