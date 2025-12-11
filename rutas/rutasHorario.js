// rutasHorario.js - Rutas para el sistema de horarios de CuidaMe
import express from 'express';
import { verificarToken, esAdministrador } from '../middlewares/authMiddleware.js';
import { 
  // Configuración del horario
  obtenerConfiguracionHorario,
  guardarConfiguracionHorario,
  
  // Actividades fijas
  obtenerActividadesFijas,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  
  // Actividades por fecha
  obtenerActividadesPorFecha,
  obtenerActividadesHoy,
  obtenerActividadesSemana,
  obtenerActividadesMes,
  
  // Registrar actividades realizadas
  registrarActividadRealizada,
  obtenerActividadesRealizadas,
  actualizarActividadRealizada,
  eliminarActividadRealizada,
  
  // Estadísticas y reportes
  obtenerEstadisticasActividades,
  generarReporteActividades,
  obtenerResumenDiario,
  obtenerResumenSemanal,
  obtenerResumenMensual,
  
  // Utilidades
  obtenerActividadesPredefinidas,
  buscarConflictosHorario,
  obtenerActividadesPorTipo,
  obtenerActividadesPorUsuario,
  obtenerActividadesPorAdultoMayor,
  
  // Horario completo
  obtenerHorarioCompleto,
  generarHorarioPDF,
  sincronizarActividades,
  resetearConfiguracion,
  
  // Recordatorios
  obtenerRecordatoriosPendientes,
  crearRecordatorio,
  eliminarRecordatorio,
  marcarRecordatorioCompletado
} from '../controllers/horarioControlador.js';

const router = express.Router();

// 🔒 Todas las rutas requieren autenticación
router.use(verificarToken);

// ========== 📅 CONFIGURACIÓN DEL HORARIO ==========

/**
 * @route   GET /api/horario/configuracion
 * @desc    Obtener la configuración del horario del adulto mayor
 * @access  Privado
 */
router.get('/configuracion', obtenerConfiguracionHorario);

/**
 * @route   PUT /api/horario/configuracion
 * @desc    Guardar o actualizar la configuración del horario
 * @access  Privado (Administradores)
 */
router.put('/configuracion', esAdministrador, guardarConfiguracionHorario);

// ========== 📋 ACTIVIDADES FIJAS ==========

/**
 * @route   GET /api/horario/actividades-fijas
 * @desc    Obtener todas las actividades fijas del adulto mayor
 * @access  Privado
 */
router.get('/actividades-fijas', obtenerActividadesFijas);

/**
 * @route   POST /api/horario/actividades
 * @desc    Crear una nueva actividad en el horario
 * @access  Privado (Administradores y Cuidadores)
 */
router.post('/actividades', esAdministrador, crearActividad);

/**
 * @route   PUT /api/horario/actividades/:id
 * @desc    Actualizar una actividad existente
 * @access  Privado (Administradores y Cuidadores)
 */
router.put('/actividades/:id', esAdministrador, actualizarActividad);

/**
 * @route   DELETE /api/horario/actividades/:id
 * @desc    Eliminar una actividad del horario (borrado lógico)
 * @access  Privado (Administradores)
 */
router.delete('/actividades/:id', esAdministrador, eliminarActividad);

// ========== 📅 ACTIVIDADES POR FECHA ==========

/**
 * @route   GET /api/horario/actividades/hoy
 * @desc    Obtener actividades para el día actual
 * @access  Privado
 */
router.get('/actividades/hoy', obtenerActividadesHoy);

/**
 * @route   GET /api/horario/actividades/fecha/:fecha
 * @desc    Obtener actividades para una fecha específica (YYYY-MM-DD)
 * @access  Privado
 */
router.get('/actividades/fecha/:fecha?', obtenerActividadesPorFecha);

/**
 * @route   GET /api/horario/actividades/semana
 * @desc    Obtener actividades para la semana actual
 * @access  Privado
 */
router.get('/actividades/semana', obtenerActividadesSemana);

/**
 * @route   GET /api/horario/actividades/mes
 * @desc    Obtener actividades para el mes actual
 * @access  Privado
 */
router.get('/actividades/mes', obtenerActividadesMes);

// ========== ✅ ACTIVIDADES REALIZADAS ==========

/**
 * @route   POST /api/horario/actividades/realizada
 * @desc    Registrar una actividad como realizada
 * @access  Privado (Todos los usuarios)
 */
router.post('/actividades/realizada', registrarActividadRealizada);

/**
 * @route   GET /api/horario/actividades-realizadas
 * @desc    Obtener historial de actividades realizadas
 * @access  Privado
 */
router.get('/actividades-realizadas', obtenerActividadesRealizadas);

/**
 * @route   PUT /api/horario/actividades-realizadas/:id
 * @desc    Actualizar una actividad realizada
 * @access  Privado (Administradores)
 */
router.put('/actividades-realizadas/:id', esAdministrador, actualizarActividadRealizada);

/**
 * @route   DELETE /api/horario/actividades-realizadas/:id
 * @desc    Eliminar un registro de actividad realizada
 * @access  Privado (Administradores)
 */
router.delete('/actividades-realizadas/:id', esAdministrador, eliminarActividadRealizada);

// ========== 📊 ESTADÍSTICAS Y REPORTES ==========

/**
 * @route   GET /api/horario/estadisticas
 * @desc    Obtener estadísticas de actividades
 * @access  Privado
 */
router.get('/estadisticas', obtenerEstadisticasActividades);

/**
 * @route   POST /api/horario/reporte
 * @desc    Generar un reporte de actividades en PDF/Excel
 * @access  Privado (Administradores)
 */
router.post('/reporte', esAdministrador, generarReporteActividades);

/**
 * @route   GET /api/horario/resumen/diario
 * @desc    Obtener resumen de actividades del día
 * @access  Privado
 */
router.get('/resumen/diario', obtenerResumenDiario);

/**
 * @route   GET /api/horario/resumen/semanal
 * @desc    Obtener resumen de actividades de la semana
 * @access  Privado
 */
router.get('/resumen/semanal', obtenerResumenSemanal);

/**
 * @route   GET /api/horario/resumen/mensual
 * @desc    Obtener resumen de actividades del mes
 * @access  Privado
 */
router.get('/resumen/mensual', obtenerResumenMensual);

// ========== 🔧 UTILIDADES ==========

/**
 * @route   GET /api/horario/actividades-predefinidas
 * @desc    Obtener actividades predefinidas del sistema
 * @access  Privado
 */
router.get('/actividades-predefinidas', obtenerActividadesPredefinidas);

/**
 * @route   POST /api/horario/buscar-conflictos
 * @desc    Buscar conflictos de horario para una nueva actividad
 * @access  Privado (Administradores y Cuidadores)
 */
router.post('/buscar-conflictos', esAdministrador, buscarConflictosHorario);

/**
 * @route   GET /api/horario/actividades/tipo/:tipo
 * @desc    Obtener actividades por tipo específico
 * @access  Privado
 */
router.get('/actividades/tipo/:tipo', obtenerActividadesPorTipo);

/**
 * @route   GET /api/horario/actividades/usuario/:usuarioId
 * @desc    Obtener actividades creadas por un usuario específico
 * @access  Privado (Administradores)
 */
router.get('/actividades/usuario/:usuarioId', esAdministrador, obtenerActividadesPorUsuario);

/**
 * @route   GET /api/horario/actividades/adulto-mayor/:adultoMayorId
 * @desc    Obtener actividades de un adulto mayor específico
 * @access  Privado (Usuarios con acceso al adulto mayor)
 */
router.get('/actividades/adulto-mayor/:adultoMayorId', obtenerActividadesPorAdultoMayor);

// ========== 📋 HORARIO COMPLETO ==========

/**
 * @route   GET /api/horario/completo
 * @desc    Obtener el horario completo (actividades + medicinas + eventos)
 * @access  Privado
 */
router.get('/completo', obtenerHorarioCompleto);

/**
 * @route   POST /api/horario/generar-pdf
 * @desc    Generar PDF del horario
 * @access  Privado (Administradores)
 */
router.post('/generar-pdf', esAdministrador, generarHorarioPDF);

/**
 * @route   POST /api/horario/sincronizar
 * @desc    Sincronizar actividades con medicinas y eventos
 * @access  Privado (Administradores)
 */
router.post('/sincronizar', esAdministrador, sincronizarActividades);

/**
 * @route   POST /api/horario/resetear-configuracion
 * @desc    Resetear configuración del horario a valores por defecto
 * @access  Privado (Administradores)
 */
router.post('/resetear-configuracion', esAdministrador, resetearConfiguracion);

// ========== 🔔 RECORDATORIOS ==========

/**
 * @route   GET /api/horario/recordatorios/pendientes
 * @desc    Obtener recordatorios pendientes para el día actual
 * @access  Privado
 */
router.get('/recordatorios/pendientes', obtenerRecordatoriosPendientes);

/**
 * @route   POST /api/horario/recordatorios
 * @desc    Crear un recordatorio personalizado
 * @access  Privado (Administradores y Cuidadores)
 */
router.post('/recordatorios', esAdministrador, crearRecordatorio);

/**
 * @route   DELETE /api/horario/recordatorios/:id
 * @desc    Eliminar un recordatorio
 * @access  Privado (Administradores)
 */
router.delete('/recordatorios/:id', esAdministrador, eliminarRecordatorio);

/**
 * @route   PUT /api/horario/recordatorios/:id/completado
 * @desc    Marcar un recordatorio como completado
 * @access  Privado (Todos los usuarios)
 */
router.put('/recordatorios/:id/completado', marcarRecordatorioCompletado);

// ========== 🎯 RUTAS ESPECIALES PARA LA APP MÓVIL ==========

/**
 * @route   GET /api/horario/actual
 * @desc    Obtener horario actual (para mostrar en la vista principal)
 * @access  Privado
 */
router.get('/actual', (req, res) => {
  // Esta ruta combina actividades de hoy + próximas + recordatorios
  res.json({
    exito: true,
    mensaje: 'Ruta para obtener horario actual (se implementará en el controlador)'
  });
});

/**
 * @route   GET /api/horario/proximas
 * @desc    Obtener próximas actividades (próximas 3 horas)
 * @access  Privado
 */
router.get('/proximas', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para próximas actividades (se implementará en el controlador)'
  });
});

/**
 * @route   POST /api/horario/marcar-varias-realizadas
 * @desc    Marcar múltiples actividades como realizadas
 * @access  Privado (Todos los usuarios)
 */
router.post('/marcar-varias-realizadas', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para marcar múltiples actividades (se implementará en el controlador)'
  });
});

// ========== 📱 RUTAS PARA NOTIFICACIONES PUSH ==========

/**
 * @route   GET /api/horario/notificaciones/pendientes
 * @desc    Obtener actividades pendientes de notificación
 * @access  Privado
 */
router.get('/notificaciones/pendientes', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para notificaciones pendientes (se implementará en el controlador)'
  });
});

/**
 * @route   POST /api/horario/notificaciones/enviar
 * @desc    Enviar notificación push para una actividad
 * @access  Privado (Sistema interno)
 */
router.post('/notificaciones/enviar', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para enviar notificaciones (se implementará en el controlador)'
  });
});

// ========== 🔄 SINCROZACIÓN OFFLINE ==========

/**
 * @route   POST /api/horario/sincronizar-offline
 * @desc    Sincronizar actividades creadas/actualizadas en modo offline
 * @access  Privado
 */
router.post('/sincronizar-offline', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para sincronización offline (se implementará en el controlador)'
  });
});

// ========== 📊 DASHBOARD ==========

/**
 * @route   GET /api/horario/dashboard
 * @desc    Obtener datos para el dashboard del horario
 * @access  Privado
 */
router.get('/dashboard', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Ruta para dashboard del horario (se implementará en el controlador)'
  });
});

export default router;