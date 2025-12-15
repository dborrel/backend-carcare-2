import Usuario from "../models/Usuario.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from 'path';

// Función para validar formato de email
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Función para validar fecha de nacimiento
const validarFechaNacimiento = (fecha) => {
  // Verificar si es una fecha válida
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) return false;
  
  // Verificar que la fecha no sea futura
  const hoy = new Date();
  if (fechaObj > hoy) return false;
  
  // Verificar que la persona tenga al menos 16 años
  const edadMinima = new Date();
  edadMinima.setFullYear(hoy.getFullYear() - 16);
  if (fechaObj > edadMinima) return false;
  
  return true;
};

// Función para registrar un nuevo usuario
export const sign_up = async (req, res) => {
  try {
    const { nombre, email, contraseña, fecha_nacimiento } = req.body;

    // Validar formato de email
    if (!validarEmail(email)) {
      return res.status(400).json({ error: "El formato del email no es válido." });
    }

    // Validar formato de fecha de nacimiento
    if (!validarFechaNacimiento(fecha_nacimiento)) {
      return res.status(400).json({ error: "La fecha de nacimiento no es válida o no cumple con la edad mínima requerida (16 años)." });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: "El email ya está registrado." });
    }

    // Hashear la contraseña
    //const salt = await bcrypt.genSalt(10);
    //const contraseñaHasheada = await bcrypt.hash(contraseña, salt);

    // Crear el nuevo usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      contrasegna: contraseña,
      fecha_nacimiento
    });

    res.status(200).json({ message: "Usuario registrado exitosamente.", usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ error: "Error al registrar el usuario.", detalles: error.message });
  }
};

// Función para autenticar a un usuario
export const sign_in = async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    // Validar formato de email
    if (!validarEmail(email)) {
      return res.status(400).json({ error: "El formato del email no es válido." });
    }

    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Verificar la contraseña
    const contraseñaValida = (contraseña === usuario.contrasegna);
    console.log("Contraseña:", contraseña);
    console.log("Contraseña almacenada:", usuario.contrasegna);
    if (!contraseñaValida) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    // Generar un token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET || "secret_key" // Usa una clave secreta desde el .env
      // { expiresIn: "1h" } // El token expira en 1 hora
    );

    // Devolvemos el token y el ID del usuario
    res.status(200).json({ 
      message: "Inicio de sesión exitoso.", 
      token,
      userId: usuario.id
    });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión.", detalles: error.message });
  }
};

// Función para obtener el nombre de usuario por ID
export const obtenerNombreUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el ID es numérico
    if (isNaN(id)) {
      return res.status(400).json({ error: "El ID debe ser un número." });
    }

    // Buscar el usuario en la base de datos
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id', 'nombre'] // Solo devolvemos el ID y el nombre para seguridad
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Verificar que el usuario que hace la petición tenga permisos
    // Esta verificación es opcional dependiendo de tus requisitos de seguridad
    if (req.usuario.id !== parseInt(id)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a esta información." });
    }

    res.status(200).json({ 
      id: usuario.id,
      nombre: usuario.nombre 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el nombre de usuario.", detalles: error.message });
  }
};

export const actualizarFotoPerfil = async (req, res) => {
  try {
    const { fotoBase64 } = req.body;
    const usuarioId = req.user?.id || req.usuario?.id;

    console.log('📸 Actualizando foto de perfil para usuario:', usuarioId);

    if (!usuarioId) {
      return res.status(401).json({
        message: 'Usuario no autenticado.'
      });
    }

    if (!fotoBase64) {
      return res.status(400).json({
        message: 'No se recibió la foto en Base64.'
      });
    }

    // Validar que sea una imagen válida (opcional)
    if (!fotoBase64.startsWith('data:image/')) {
      return res.status(400).json({
        message: 'El formato de la imagen no es válido.'
      });
    }

    // Guardar directamente el Base64 en la base de datos
    await Usuario.update(
      { foto_perfil: fotoBase64 },
      { where: { id: usuarioId } }
    );

    console.log('✅ Foto actualizada correctamente');

    return res.status(200).json({
      message: 'Foto de perfil actualizada correctamente.',
      foto_perfil: fotoBase64
    });

  } catch (error) {
    console.error('❌ Error al actualizar foto:', error);
    return res.status(500).json({
      message: 'Error al actualizar foto de perfil.',
      error: error.message
    });
  }
};

export const obtenerFotoPerfil = async (req, res) => {
  try {
    const usuarioId = req.user?.id || req.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        error: "Usuario no autenticado." 
      });
    }

    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['foto_perfil'] 
    });

    if (!usuario) {
      return res.status(404).json({ 
        error: "Usuario no encontrado." 
      });
    }

    return res.status(200).json({ 
      foto_perfil_url: usuario.foto_perfil || null
    });

  } catch (error) {
    console.error('Error al obtener foto:', error);
    return res.status(500).json({ 
      error: "Error al obtener la foto de perfil.", 
      detalles: error.message 
    });
  }
};