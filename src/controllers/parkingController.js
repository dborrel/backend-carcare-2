import Parking from "../models/Parking.js";
import { Usuario } from "../models/index.js";

// Función para crear un nuevo parking
export const crearParking = async (req, res) => {
  try {
    const { nombre, ubicacion, notas } = req.body;
    const usuarioId = req.usuario.id;

    // Validar campos obligatorios
    if (!nombre || !ubicacion) {
      return res.status(400).json({ error: "Faltan campos obligatorios (nombre y ubicación)." });
    }

    // Validar formato de ubicación
    if (!ubicacion.lat || !ubicacion.lng) {
      return res.status(400).json({ error: "La ubicación debe contener latitud (lat) y longitud (lng)." });
    }

    // Validar que las coordenadas sean números
    if (typeof ubicacion.lat !== 'number' || typeof ubicacion.lng !== 'number') {
      return res.status(400).json({ error: "Las coordenadas deben ser números." });
    }

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Crear el nuevo parking
    const nuevoParking = await Parking.create({
      nombre,
      ubicacion,
      notas: notas || null,
      usuarioId
    });

    res.status(201).json({ 
      message: "Parking creado exitosamente.", 
      parking: nuevoParking 
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error al crear el parking.", 
      detalles: error.message 
    });
  }
};

// Función para obtener los parkings de un usuario
export const obtenerParkingsUsuario = async (req, res) => {
  try {
    const usuarioId = req.params.usuarioId;
    const usuarioAutenticado = req.usuario.id;

    // Verificar que el usuario autenticado sea el mismo que solicita los parkings
    if (parseInt(usuarioId) !== usuarioAutenticado) {
      return res.status(403).json({ error: "No tienes permisos para ver los parkings de otro usuario." });
    }

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Obtener parkings del usuario
    const parkings = await Parking.findAll({
      where: { usuarioId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ parkings });
  } catch (error) {
    res.status(500).json({ 
      error: "Error al obtener los parkings.", 
      detalles: error.message 
    });
  }
};

// Función para obtener un parking por ID
export const obtenerParkingPorId = async (req, res) => {
  try {
    const parkingId = req.params.parkingId;
    const usuarioId = req.usuario.id;

    const parking = await Parking.findByPk(parkingId);

    if (!parking) {
      return res.status(404).json({ error: "Parking no encontrado." });
    }

    // Verificar que el parking pertenece al usuario autenticado
    if (parking.usuarioId !== usuarioId) {
      return res.status(403).json({ error: "No tienes permisos para ver este parking." });
    }

    res.status(200).json({ parking });
  } catch (error) {
    res.status(500).json({ 
      error: "Error al obtener el parking.", 
      detalles: error.message 
    });
  }
};

// Función para actualizar un parking
export const actualizarParking = async (req, res) => {
  try {
    const parkingId = req.params.parkingId;
    const usuarioId = req.usuario.id;
    const { nombre, ubicacion, notas } = req.body;

    const parking = await Parking.findByPk(parkingId);

    if (!parking) {
      return res.status(404).json({ error: "Parking no encontrado." });
    }

    // Verificar que el parking pertenece al usuario autenticado
    if (parking.usuarioId !== usuarioId) {
      return res.status(403).json({ error: "No tienes permisos para editar este parking." });
    }

    // Validar ubicación si se proporciona
    if (ubicacion) {
      if (!ubicacion.lat || !ubicacion.lng) {
        return res.status(400).json({ error: "La ubicación debe contener latitud (lat) y longitud (lng)." });
      }
      if (typeof ubicacion.lat !== 'number' || typeof ubicacion.lng !== 'number') {
        return res.status(400).json({ error: "Las coordenadas deben ser números." });
      }
    }

    // Actualizar campos
    const datosActualizados = {};
    if (nombre !== undefined) datosActualizados.nombre = nombre;
    if (ubicacion !== undefined) datosActualizados.ubicacion = ubicacion;
    if (notas !== undefined) datosActualizados.notas = notas;

    await parking.update(datosActualizados);

    res.status(200).json({ 
      message: "Parking actualizado correctamente.", 
      parking 
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error al actualizar el parking.", 
      detalles: error.message 
    });
  }
};

// Función para eliminar un parking
export const eliminarParking = async (req, res) => {
  try {
    const parkingId = req.params.parkingId;
    const usuarioId = req.usuario.id;

    const parking = await Parking.findByPk(parkingId);

    if (!parking) {
      return res.status(404).json({ error: "Parking no encontrado." });
    }

    // Verificar que el parking pertenece al usuario autenticado
    if (parking.usuarioId !== usuarioId) {
      return res.status(403).json({ error: "No tienes permisos para eliminar este parking." });
    }

    await parking.destroy();

    res.status(200).json({ message: "Parking eliminado correctamente." });
  } catch (error) {
    res.status(500).json({ 
      error: "Error al eliminar el parking.", 
      detalles: error.message 
    });
  }
};