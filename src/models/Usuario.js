import { DataTypes } from "sequelize";
const isTest = process.env.NODE_ENV === 'test';
const sequelize = isTest 
  ? (await import("../config/database.test.js")).default
  : (await import("../config/database.js")).default;
const Usuario = sequelize.define("Usuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  contrasegna: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY, // Almacena solo la fecha (YYYY-MM-DD)
    allowNull: false,
  },
  ubicaciones_preferidas: {
    type: DataTypes.JSON, // Almacena una lista de objetos JSON
    allowNull: true, // Puede ser opcional
    defaultValue: [], // Por defecto, una lista vacía
  },
  // Campos para suscripción premium
  es_premium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  tipo_suscripcion: {
    type: DataTypes.ENUM('mensual', 'anual'),
    allowNull: true,
  },
  fecha_inicio_premium: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_fin_premium: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ultimo_anuncio_visto: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  foto_perfil: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    defaultValue: null
  },
});

export default Usuario;
