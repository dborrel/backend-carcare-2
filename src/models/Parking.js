import { DataTypes } from "sequelize";

const isTest = process.env.NODE_ENV === 'test';
const sequelize = isTest 
  ? (await import("../config/database.test.js")).default
  : (await import("../config/database.js")).default;

const Parking = sequelize.define("Parking", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ubicacion: {
    type: DataTypes.JSON, // Coordenadas de ubicación (latitud y longitud)
    allowNull: false,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

export default Parking;