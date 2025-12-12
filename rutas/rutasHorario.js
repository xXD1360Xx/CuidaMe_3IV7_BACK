/**
 * rutas/horarioRutas.js - Rutas para Gestión de Horarios
 */
import express from 'express';
import * as horarioControlador from '../controladores/horarioControlador.js';

const router = express.Router();

// ==================== RUTAS DE CONFIGURACIÓN ====================

/**
 * 1. Obtener configuración del horario
 * POST /api/horario/configuracion
 */
router.post('/configuracion', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await horarioControlador.obtenerConfiguracionHorario(usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json({
      exito: true,
      configuracion: resultado.configuracion,
      mensaje: resultado.configuracion.adulto_mayor_id 
        ? 'Configuración obtenida correctamente' 
        : 'Configuración por defecto generada'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /configuracion:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 2. Guardar configuración del horario
 * POST /api/horario/guardar-configuracion
 */
router.post('/guardar-configuracion', async (req, res) => {
  try {
    const { usuario_id, configuracion } = req.body;
    
    if (!usuario_id || !configuracion) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y configuración son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.guardarConfiguracionHorario(usuario_id, configuracion);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 : 
                       resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /guardar-configuracion:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ACTIVIDADES FIJAS ====================

/**
 * 3. Obtener actividades fijas
 * POST /api/horario/actividades-fijas
 */
router.post('/actividades-fijas', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await horarioControlador.obtenerActividadesFijas(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-fijas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 4. Crear actividad
 * POST /api/horario/crear-actividad
 */
router.post('/crear-actividad', async (req, res) => {
  try {
    const { usuario_id, actividad } = req.body;
    
    if (!usuario_id || !actividad) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y actividad son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.crearActividad(usuario_id, actividad);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'DIAS_INVALIDOS' ? 400 :
                       resultado.codigo === 'HORA_FORMATO_INVALIDO' ? 400 :
                       resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'CONFLICTO_HORARIO' ? 409 :
                       resultado.codigo === 'ACTIVIDAD_DUPLICADA' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /crear-actividad:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 5. Actualizar actividad
 * PUT /api/horario/actualizar-actividad/:id
 */
router.put('/actualizar-actividad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, actividad } = req.body;
    
    if (!id || !usuario_id || !actividad) {
      return res.status(400).json({
        exito: false,
        error: 'ID de actividad, usuario y datos de actualización son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.actualizarActividad(id, usuario_id, actividad);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
                       resultado.codigo === 'SIN_PERMISOS' ? 403 :
                       resultado.codigo === 'SIN_CAMPOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-actividad:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Eliminar actividad
 * DELETE /api/horario/eliminar-actividad/:id
 */
router.delete('/eliminar-actividad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    
    if (!id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de actividad y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.eliminarActividad(id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
                       resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eliminar-actividad:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE CONSULTA DE ACTIVIDADES ====================

/**
 * 7. Obtener actividades por fecha específica
 * POST /api/horario/actividades-fecha
 */
router.post('/actividades-fecha', async (req, res) => {
  try {
    const { usuario_id, fecha } = req.body;
    
    if (!usuario_id || !fecha) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y fecha son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.obtenerActividadesPorFecha(usuario_id, fecha);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'FECHA_FORMATO_INVALIDO' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-fecha:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 8. Obtener actividades de hoy
 * POST /api/horario/actividades-hoy
 */
router.post('/actividades-hoy', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await horarioControlador.obtenerActividadesHoy(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-hoy:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 9. Obtener actividades por tipo
 * POST /api/horario/actividades-tipo
 */
router.post('/actividades-tipo', async (req, res) => {
  try {
    const { usuario_id, tipo } = req.body;
    
    if (!usuario_id || !tipo) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y tipo de actividad son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await horarioControlador.obtenerActividadesPorTipo(usuario_id, tipo);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-tipo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Obtener actividades de la semana
 * POST /api/horario/actividades-semana
 */
router.post('/actividades-semana', async (req, res) => {
  try {
    const { usuario_id, fecha_inicio } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await horarioControlador.obtenerActividadesSemana(usuario_id, fecha_inicio);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-semana:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE REGISTRO Y SEGUIMIENTO ====================

/**
 * 11. Registrar actividad realizada
 * POST /api/horario/registrar-actividad
 */
router.post('/registrar-actividad', async (req, res) => {
  try {
    const { usuario_id, actividad_id, fecha, completada, observaciones } = req.body;
    
    if (!usuario_id || !actividad_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y actividad son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const datos = {
      actividad_id,
      fecha,
      completada,
      observaciones
    };
    
    const resultado = await horarioControlador.registrarActividadRealizada(usuario_id, datos);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
                       resultado.codigo === 'SIN_ACCESO' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /registrar-actividad:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE RESÚMENES Y ESTADÍSTICAS ====================

/**
 * 12. Obtener resumen diario
 * POST /api/horario/resumen-diario
 */
router.post('/resumen-diario', async (req, res) => {
  try {
    const { usuario_id, fecha } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await horarioControlador.obtenerResumenDiario(usuario_id, fecha);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /resumen-diario:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE UTILIDADES ====================

/**
 * 13. Buscar conflictos de horario
 * POST /api/horario/buscar-conflictos
 */
router.post('/buscar-conflictos', async (req, res) => {
  try {
    const { usuario_id, dias, hora_inicio, hora_fin, actividad_id } = req.body;
    
    if (!usuario_id || !dias || !hora_inicio || !hora_fin) {
      return res.status(400).json({
        exito: false,
        error: 'Datos incompletos para buscar conflictos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const datos = {
      dias,
      hora_inicio,
      hora_fin,
      actividad_id
    };
    
    const resultado = await horarioControlador.buscarConflictosHorario(usuario_id, datos);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /buscar-conflictos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 14. Obtener actividades predefinidas
 * GET /api/horario/actividades-predeifinidas
 */
router.get('/actividades-predeifinidas', async (req, res) => {
  try {
    const resultado = await horarioControlador.obtenerActividadesPredefinidas();
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividades-predeifinidas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 15. Obtener estadísticas del horario
 * POST /api/horario/estadisticas
 */
router.post('/estadisticas', async (req, res) => {
  try {
    const { usuario_id, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener todas las actividades en el rango de fechas
    const actividadesResult = await horarioControlador.obtenerActividadesFijas(usuario_id);
    
    if (!actividadesResult.exito) {
      return res.status(500).json(actividadesResult);
    }
    
    // Obtener resumen de la semana actual
    const resumenSemanaResult = await horarioControlador.obtenerResumenDiario(usuario_id);
    
    // Calcular estadísticas
    const actividades = actividadesResult.actividades;
    
    const estadisticas = {
      total_actividades: actividades.length,
      por_tipo: actividades.reduce((acc, actividad) => {
        if (!acc[actividad.tipo]) {
          acc[actividad.tipo] = 0;
        }
        acc[actividad.tipo]++;
        return acc;
      }, {}),
      por_dia: actividades.reduce((acc, actividad) => {
        if (actividad.dias && Array.isArray(actividad.dias)) {
          actividad.dias.forEach(dia => {
            if (!acc[dia]) {
              acc[dia] = 0;
            }
            acc[dia]++;
          });
        }
        return acc;
      }, {}),
      total_recurrentes: actividades.filter(a => a.esRecurrente).length,
      total_no_recurrentes: actividades.filter(a => !a.esRecurrente).length,
      resumen_hoy: resumenSemanaResult.exito ? resumenSemanaResult.resumen : null
    };
    
    res.status(200).json({
      exito: true,
      estadisticas,
      periodo: {
        fecha_inicio: fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin: fecha_fin || new Date().toISOString().split('T')[0]
      }
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /estadisticas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE EXPORTACIÓN ====================

/**
 * 16. Exportar horario a PDF
 * POST /api/horario/exportar-pdf
 */
router.post('/exportar-pdf', async (req, res) => {
  try {
    const { usuario_id, tipo_exportacion, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener configuración
    const configResult = await horarioControlador.obtenerConfiguracionHorario(usuario_id);
    
    if (!configResult.exito) {
      return res.status(404).json(configResult);
    }
    
    // Obtener actividades
    const actividadesResult = await horarioControlador.obtenerActividadesFijas(usuario_id);
    
    // Obtener resumen de la semana
    const resumenResult = await horarioControlador.obtenerResumenDiario(usuario_id);
    
    // Preparar datos para exportación
    const datosExportacion = {
      configuracion: configResult.configuracion,
      actividades: actividadesResult.exito ? actividadesResult.actividades : [],
      resumen: resumenResult.exito ? resumenResult.resumen : {},
      fecha_generacion: new Date().toISOString(),
      tipo: tipo_exportacion || 'semanal'
    };
    
    // En un sistema real, aquí generas el PDF
    // Por ahora, devolvemos los datos para que el frontend los maneje
    
    res.status(200).json({
      exito: true,
      datos: datosExportacion,
      formato: 'pdf',
      nombre_archivo: `horario_${Date.now()}.pdf`,
      mensaje: 'Horario listo para exportar a PDF'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /exportar-pdf:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 17. Sincronizar horario
 * POST /api/horario/sincronizar
 */
router.post('/sincronizar', async (req, res) => {
  try {
    const { usuario_id, datos_sincronizacion } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Aquí implementarías la lógica de sincronización
    // Por ahora, devolvemos un estado básico
    
    console.log('🔄 Sincronizando horario para usuario:', usuario_id);
    
    res.status(200).json({
      exito: true,
      sincronizado_en: new Date().toISOString(),
      cambios_aplicados: 0,
      mensaje: 'Sincronización completada (modo de demostración)'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /sincronizar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE PRUEBA ====================

/**
 * 18. Ruta de prueba
 * GET /api/horario/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    exito: true,
    mensaje: 'API de Horario funcionando correctamente',
    version: '1.0.0',
    fecha: new Date().toISOString()
  });
});

// ==================== EXPORTACIÓN ====================

export default router;