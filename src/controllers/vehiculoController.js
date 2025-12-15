import Vehiculo from "../models/Vehiculo.js";
import { Usuario } from "../models/index.js";

// Función para registrar un nuevo vehículo
export const registrarVehiculo = async (req, res) => {
  try {
    const {
      usuarioId,
      nombre,
      matricula,
      modelo,
      fabricante,
      antiguedad,
      tipo_combustible,
      litros_combustible,
      consumo_medio,
      ubicacion_actual,
      estado,
      tipo
    } = req.body;

    // Imprimir request body para depuración
    console.log("Request Body:", req.body);

    // Validar campos obligatorios
    if (
      usuarioId === undefined || usuarioId === null ||
      nombre === undefined || nombre === null ||
      matricula === undefined || matricula === null ||
      modelo === undefined || modelo === null ||
      fabricante === undefined || fabricante === null ||
      antiguedad === undefined || antiguedad === null ||
      tipo_combustible === undefined || tipo_combustible === null ||
      consumo_medio === undefined || consumo_medio === null
    ) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    // Validar tipo_combustible
    const combustiblesValidos = ["Gasolina", "Diésel", "Eléctrico", "Híbrido", "GLP"];
    if (!combustiblesValidos.includes(tipo_combustible)) {
      return res.status(400).json({ error: "Tipo de combustible no válido." });
    }

    // Validar estado
    const estadosValidos = ["Activo", "Inactivo", "Mantenimiento"];
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado no válido." });
    }

    // Validar tipo de vehículo
    const tiposValidos = ["Coche", "Moto", "Furgoneta", "Camión"];
    if (tipo && !tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de vehículo no válido." });
    }

    // Validar matrícula duplicada
    const vehiculoExistente = await Vehiculo.findOne({ where: { matricula } });
    if (vehiculoExistente) {
      return res.status(409).json({ error: "La matrícula ya está registrada." });
    }

    // Buscar al usuario que registra el vehículo
   const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Crear el nuevo vehículo
    const nuevoVehiculo = await Vehiculo.create({
      nombre,
      matricula,
      modelo,
      fabricante,
      antiguedad,
      tipo_combustible,
      litros_combustible,
      consumo_medio,
      ubicacion_actual,
      // 🚨 CORRECCIÓN CLAVE 1: Forzar el estado inicial a "Inactivo"
      estado: 'Inactivo', 
      tipo,
      propietarioId: usuarioId,
      // 🚨 CORRECCIÓN CLAVE 2: Asegurar que NO haya un usuario activo al crearse
      usuarioActivoId: null 
    });

    // 🚨 CORRECCIÓN CLAVE 3: Esta línea es crucial y ya la tienes, asegura la vinculación
    await usuario.addVehiculo(nuevoVehiculo);

    res.status(200).json({ message: "Vehículo registrado exitosamente.", vehiculo: nuevoVehiculo });
  } catch (error) {
    res.status(500).json({ error: "Error al registrar el vehículo.", detalles: error.message });
  }
};

// Función para obtener los vehículos asociados a un usuario
export const obtenerVehiculosUsuario = async (req, res) => {
  try {
    const usuarioId = req.params.usuarioId;

    // Comprobación de existencia de usuario
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Obtener vehículos asociados al usuario, incluyendo los usuarios vinculados
    const vehiculos = await usuario.getVehiculos({
      include: [{
        model: Usuario,
        attributes: ['nombre'],
        through: { attributes: [] } // No incluir datos de la tabla intermedia
      }]
    });

    // Formatear la respuesta para incluir los nombres de los usuarios vinculados
    const resultado = vehiculos.map(vehiculo => ({
      ...vehiculo.toJSON(),
      usuariosVinculados: vehiculo.Usuarios.map(u => u.nombre)
    }));

    res.status(200).json({ vehiculos: resultado });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los vehículos.", detalles: error.message });
  }
};

// Obtener la ubicación de un vehículo
export const obtenerUbicacionVehiculo = async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const usuarioId = req.usuario.id;

    const vehiculo = await Vehiculo.findByPk(vehiculoId, {
      include: [{
        model: Usuario,
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }

    // Comprobar si el usuario está asociado al vehículo
    const vinculado = vehiculo.Usuarios.some(u => u.id === usuarioId);
    if (!vinculado) {
      return res.status(403).json({ error: "No tienes permisos para ver la ubicación de este vehículo." });
    }

    res.status(200).json({ ubicacion_actual: vehiculo.ubicacion_actual });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la ubicación.", detalles: error.message });
  }
};

// Actualizar la ubicación de un vehículo
export const actualizarUbicacionVehiculo = async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const usuarioId = req.usuario.id;
    const { ubicacion_actual } = req.body;

    const vehiculo = await Vehiculo.findByPk(vehiculoId, {
      include: [{
        model: Usuario,
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }

    // Comprobar si el usuario está asociado al vehículo
    const vinculado = vehiculo.Usuarios.some(u => u.id === usuarioId);
    if (!vinculado) {
      return res.status(403).json({ error: "No tienes permisos para actualizar la ubicación de este vehículo." });
    }

    vehiculo.ubicacion_actual = ubicacion_actual;
    await vehiculo.save();

    res.status(200).json({ message: "Ubicación actualizada correctamente.", ubicacion_actual: vehiculo.ubicacion_actual });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la ubicación.", detalles: error.message });
  }
};

// Eliminar un vehículo (propietario: elimina todo, no propietario: elimina relación)
export const eliminarVehiculo = async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const usuarioId = req.usuario.id;

    const vehiculo = await Vehiculo.findByPk(vehiculoId, {
      include: [{ model: Usuario, as: 'Usuarios', attributes: ['id'], through: { attributes: [] } }]
    });

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }

    if (vehiculo.propietarioId === usuarioId) {
      // Es propietario: elimina el vehículo y todas las relaciones
      await vehiculo.destroy();
      return res.status(200).json({ message: "Vehículo eliminado correctamente (propietario)." });
    } else {
      // No es propietario: elimina solo la relación usuario-vehículo
      await vehiculo.removeUsuario(usuarioId);
      return res.status(200).json({ message: "Relación con el vehículo eliminada correctamente." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el vehículo.", detalles: error.message });
  }
};

// Editar un vehículo (solo propietario)
export const editarVehiculo = async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const usuarioId = req.usuario.id;
    const camposEditables = [
      "nombre", "matricula", "modelo", "fabricante", "antiguedad",
      "tipo_combustible", "litros_combustible", "consumo_medio",
      "ubicacion_actual", "estado", "tipo"
    ];
    const datos = {};
    for (const campo of camposEditables) {
      if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    }

    const vehiculo = await Vehiculo.findByPk(vehiculoId);
    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }
    if (vehiculo.propietarioId !== usuarioId) {
      return res.status(403).json({ error: "Solo el propietario puede editar el vehículo." });
    }

    await vehiculo.update(datos);
    res.status(200).json({ message: "Vehículo actualizado correctamente.", vehiculo });
  } catch (error) {
    res.status(500).json({ error: "Error al editar el vehículo.", detalles: error.message });
  }
};

// Eliminar a un usuario del vehículo (solo propietario)
export const eliminarUsuarioDeVehiculo = async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const usuarioId = req.usuario.id;
    const usuarioAEliminarNombre = req.body.usuarioNombre;

    // Buscar al usuario a eliminar por su nombre
    const usuarioAEliminar = await Usuario.findOne({ where: { nombre: usuarioAEliminarNombre } });
    if (!usuarioAEliminar) {
      return res.status(404).json({ error: "Usuario a eliminar no encontrado." });
    }

    const usuarioAEliminarId = usuarioAEliminar.id;

    const vehiculo = await Vehiculo.findByPk(vehiculoId, {
      include: [{ model: Usuario, attributes: ['id'], through: { attributes: [] } }]
    });

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }
    if (vehiculo.propietarioId !== usuarioId) {
      return res.status(403).json({ error: "Solo el propietario puede eliminar usuarios del vehículo." });
    }
    if (usuarioAEliminarId === usuarioId) {
      return res.status(400).json({ error: "El propietario no puede eliminarse a sí mismo." });
    }

    const usuarioVinculado = vehiculo.Usuarios.some(u => u.id === usuarioAEliminarId);
    if (!usuarioVinculado) {
      return res.status(404).json({ error: "El usuario no está vinculado a este vehículo." });
    }

    await vehiculo.removeUsuario(usuarioAEliminarId);
    res.status(200).json({ message: "Usuario eliminado del vehículo correctamente." });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario del vehículo.", detalles: error.message });
  }
};

// Función para cambiar el estado de un vehículo
export const actualizarEstadoVehiculo = async (req, res) => {
    try {
        const vehiculoId = req.params.vehiculoId;
        // El ID del usuario que hace la petición viene del middleware de autenticación
        const usuarioId = req.usuario.id; 
        const { estado } = req.body; 
        
        // --- 1. NORMALIZACIÓN Y VALIDACIÓN ---
        // Normalizamos el estado para que siempre tenga Mayúscula Inicial
        const nuevoEstadoNormalizado = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();

        const estadosValidos = ["Activo", "Inactivo", "Mantenimiento"];
        if (!estadosValidos.includes(nuevoEstadoNormalizado)) {
            return res.status(400).json({ error: "Estado no válido. Debe ser Activo, Inactivo o Mantenimiento." });
        }

        // 2. Obtener vehículo y usuarios vinculados
        const vehiculo = await Vehiculo.findByPk(vehiculoId, {
            attributes: ['id', 'estado', 'usuarioActivoId'], 
            include: [{ 
                model: Usuario, 
                attributes: ['id'], 
                through: { attributes: [] } 
            }]
        });

        if (!vehiculo) {
            return res.status(404).json({ error: "Vehículo no encontrado." });
        }

        // 3. Verificar vinculación
        // Aseguramos que usuarioId sea del mismo tipo que u.id antes de comparar
        const usuarioIdStr = String(usuarioId);
        const vinculado = vehiculo.Usuarios.some(u => String(u.id) === usuarioIdStr);
        if (!vinculado) {
          console.log(`[DEBUG] Vehiculo ID: ${vehiculoId}`);
          console.log(`[DEBUG] Estado Actual: ${vehiculo.estado}`);
          console.log(`[DEBUG] Usuario Activo ID (DB): ${vehiculo.usuarioActivoId}`);
          console.log(`[DEBUG] Usuario Actual (Petición): ${usuarioIdStr}`);
          return res.status(403).json({ error: "No tienes permisos para cambiar el estado de este vehículo." });
        }
        
        // --- 4. REGLA DE EXCLUSIVIDAD (Con estado normalizado) ---
        // Si el estado actual es 'Activo' y NO es el usuario actual quien lo activó, se deniega.
        // Aseguramos que usuarioActivoId también se convierta a String para la comparación
        if (vehiculo.estado === 'Activo' && String(vehiculo.usuarioActivoId) !== usuarioIdStr) {
          console.log(`[DEBUG] Vehiculo ID: ${vehiculoId}`);
          console.log(`[DEBUG] Estado Actual: ${vehiculo.estado}`);
          console.log(`[DEBUG] Usuario Activo ID (DB): ${vehiculo.usuarioActivoId}`);
          console.log(`[DEBUG] Usuario Actual (Petición): ${usuarioIdStr}`);
            return res.status(403).json({ error: "El vehículo está activo y solo puede ser liberado por el usuario que lo activó." });
        }

        // 5. Aplicar cambios
        if (nuevoEstadoNormalizado === 'Activo') {
            // Se activa: se bloquea con el ID del usuario actual
            vehiculo.estado = 'Activo';
            vehiculo.usuarioActivoId = usuarioId; // Aquí usamos el ID numérico
        } else {
            // Se desactiva/mantenimiento: se libera el bloqueo
            vehiculo.estado = nuevoEstadoNormalizado;
            vehiculo.usuarioActivoId = null; // Liberamos el bloqueo
        }

        const vehiculoActualizado = await vehiculo.save();

        // --- 6. Devolver Respuesta (Corregido el formato para el móvil) ---
        // Al devolver el objeto 'vehiculo' directamente después de save() (paso 5), 
        // Sequelize NO siempre incluye las asociaciones (Usuarios). 
        // Para asegurar que el cliente reciba la información que necesita, creamos un objeto limpio:
        res.status(200).json({ 
            message: `Estado del vehículo actualizado a '${nuevoEstadoNormalizado}' correctamente.`,
            vehiculo: {
                id: vehiculoActualizado.id,
                estado: vehiculoActualizado.estado,
                usuarioActivoId: vehiculoActualizado.usuarioActivoId, // ESTO AHORA ES '6' o 'null'
                // Puedes añadir Usuarios aquí si es necesario, pero para el estado, esto es suficiente.
            }
        });
    } catch (error) {
        console.error('ERROR al actualizar el estado del vehículo:', error);
        res.status(500).json({ 
            error: "Error al actualizar el estado del vehículo.", 
            detalles: error.message 
        });
    }
};