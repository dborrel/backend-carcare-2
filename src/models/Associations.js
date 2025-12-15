import Usuario from "./Usuario.js";
import Vehiculo from "./Vehiculo.js";
import Reserva from "./Reserva.js";
import Invitacion from "./Invitacion.js";
import Viaje from "./Viaje.js";
import Repostaje from "./Repostaje.js";
import Logro from "./Logro.js";
import UsuarioLogro from "./UsuarioLogro.js";
import Incidencia from "./Incidencia.js";
import Revision from "./Revision.js";
import Parking from "./Parking.js";

// Relación N:M (muchos a muchos) entre Usuario y Vehiculo
Usuario.belongsToMany(Vehiculo, { through: "UsuarioVehiculo" });
Vehiculo.belongsToMany(Usuario, { through: "UsuarioVehiculo" });

// Relación 1:N entre Usuario y Reserva
Usuario.hasMany(Reserva, { 
  foreignKey: "UsuarioId",
  onDelete: "CASCADE" 
});
Reserva.belongsTo(Usuario, { 
  foreignKey: "UsuarioId" 
});

// Relación 1:N entre Vehiculo y Reserva
Vehiculo.hasMany(Reserva, { 
  foreignKey: "VehiculoId",
  onDelete: "CASCADE" 
});
Reserva.belongsTo(Vehiculo, { 
  foreignKey: "VehiculoId" 
});

// Relación 1:N entre Vehiculo e Invitacion
Vehiculo.hasMany(Invitacion, { foreignKey: "vehiculoId" });
Invitacion.belongsTo(Vehiculo, { foreignKey: "vehiculoId" });

// Relación 1:N entre Usuario (creador) e Invitacion
Usuario.hasMany(Invitacion, { foreignKey: "creadoPorId", as: "InvitacionesCreadas" });
Invitacion.belongsTo(Usuario, { foreignKey: "creadoPorId", as: "Creador" });

// Relación 1:N entre Usuario (invitado) e Invitacion
Usuario.hasMany(Invitacion, { foreignKey: "usuarioInvitadoId", as: "InvitacionesRecibidas" });
Invitacion.belongsTo(Usuario, { foreignKey: "usuarioInvitadoId", as: "Invitado" });

// Relación 1:N entre Usuario y Viaje
Usuario.hasMany(Viaje, { foreignKey: "usuarioId" });
Viaje.belongsTo(Usuario, { foreignKey: "usuarioId" });

// Relacion 1:N entre Vehiculo y Viaje
Vehiculo.hasMany(Viaje, { foreignKey: "vehiculoId" });
Viaje.belongsTo(Vehiculo, { foreignKey: "vehiculoId" });

// Relación 1:N entre Usuario y Repostaje
Usuario.hasMany(Repostaje, { foreignKey: "usuarioId" });
Repostaje.belongsTo(Usuario, { foreignKey: "usuarioId" });

// Relación 1:N entre Vehiculo y Repostaje
Vehiculo.hasMany(Repostaje, { foreignKey: "vehiculoId" });
Repostaje.belongsTo(Vehiculo, { foreignKey: "vehiculoId" });

Usuario.belongsToMany(Logro, { 
  through: UsuarioLogro,
  foreignKey: "usuarioId"
});
Logro.belongsToMany(Usuario, { 
  through: UsuarioLogro,
  foreignKey: "logroId"
});

// Relaciones directas para acceder a la tabla intermedia
Usuario.hasMany(UsuarioLogro, { foreignKey: "usuarioId" });
UsuarioLogro.belongsTo(Usuario, { foreignKey: "usuarioId" });

Logro.hasMany(UsuarioLogro, { foreignKey: "logroId" });
UsuarioLogro.belongsTo(Logro, { foreignKey: "logroId" });

// Relación 1:N entre Vehiculo e Incidencia
Vehiculo.hasMany(Incidencia, { foreignKey: "vehiculoId" });
Incidencia.belongsTo(Vehiculo, { foreignKey: "vehiculoId" });

// Relación 1:N entre Usuario e Incidencia
Usuario.hasMany(Incidencia, { foreignKey: "usuarioId" });
Incidencia.belongsTo(Usuario, { foreignKey: "usuarioId" });

// Relación 1:N entre Usuario y Revision
Usuario.hasMany(Revision, { foreignKey: "usuarioId" });
Revision.belongsTo(Usuario, { foreignKey: "usuarioId" });

// Relación 1:N entre Vehiculo y Revision
Vehiculo.hasMany(Revision, { foreignKey: "vehiculoId" });
Revision.belongsTo(Vehiculo, { foreignKey: "vehiculoId" });

// Relación Usuario-Parking (1:N)
Usuario.hasMany(Parking, { foreignKey: "usuarioId" });
Parking.belongsTo(Usuario, { foreignKey: "usuarioId" });

export { Usuario, Vehiculo, Reserva, Invitacion, Repostaje, Incidencia, Viaje, Revision, Logro, UsuarioLogro, Parking };