import { DataTypes } from "sequelize";
// Usar la misma lógica que Usuario.js para importar la BD correcta
const isTest = process.env.NODE_ENV === 'test';
const sequelize = isTest 
  ? (await import("../config/database.test.js")).default
  : (await import("../config/database.js")).default;
const Vehiculo = sequelize.define("Vehiculo", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  matricula: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fabricante: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  antiguedad: {
    type: DataTypes.INTEGER, // Años de antigüedad
    allowNull: false,
  },
  tipo_combustible: {
    type: DataTypes.ENUM("Gasolina", "Diésel", "Eléctrico", "Híbrido", "GLP"), // Tipos de combustible
    allowNull: false,
  },
  litros_combustible: {
    type: DataTypes.FLOAT, // Cantidad de combustible en litros
    allowNull: false,
    defaultValue: 0, // Por defecto, 0 litros
  },
  consumo_medio: {
    type: DataTypes.FLOAT, // Consumo medio en litros por 100 km
    allowNull: false,
  },
  ubicacion_actual: {
    type: DataTypes.JSON, // Coordenadas de ubicación actual (latitud y longitud)
    allowNull: true,
    defaultValue: null,
  },
  estado: {
    type: DataTypes.ENUM("Activo", "Inactivo", "Mantenimiento"), // Estado del vehículo
    defaultValue: 'Inactivo', // Estado inicial
    allowNull: false
  },
  usuarioActivoId: {
      type: DataTypes.INTEGER, // Debe coincidir con el tipo de 'Usuario.id'
      allowNull: true,         // Permite NULL si el vehículo no está 'activo'
      references: {
          model: 'Usuarios', // Nombre de la tabla referenciada
          key: 'id'
      }
  },
  tipo: {
    type: DataTypes.ENUM("Coche", "Moto", "Furgoneta", "Camión"), // Tipo de vehículo
    allowNull: false,
    defaultValue: "Coche",
  },
  propietarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

export default Vehiculo;
