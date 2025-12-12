// rutas/medicinasRutas.js - Rutas para Gestión de Medicinas
import express from 'express';
import medicinasControlador from '../controladores/medicinasControlador.js';

const router = express.Router();

// ==================== RUTAS DE MEDICINAS CRUD ====================

/**
 * 1. Obtener todas las medicinas
 * POST /api/medicinas/todas
 */
router.post('/todas', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerTodasMedicinas(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /todas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 2. Obtener medicinas para hoy
 * POST /api/medicinas/hoy
 */
router.post('/hoy', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerMedicinasHoy(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /hoy:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 3. Obtener medicinas frecuentes
 * POST /api/medicinas/frecuentes
 */
router.post('/frecuentes', async (req, res) => {
  try {
    const { usuario_id, limite } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerMedicinasFrecuentes(
      usuario_id, 
      limite || 5
    );
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /frecuentes:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 4. Crear nueva medicina
 * POST /api/medicinas/crear
 */
router.post('/crear', async (req, res) => {
  try {
    const { usuario_id, medicina } = req.body;
    
    if (!usuario_id || !medicina) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos de medicina son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.crearMedicina(usuario_id, medicina);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' || resultado.codigo === 'ADULTO_NO_ENCONTRADO' 
        ? 403 
        : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /crear:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 5. Actualizar medicina
 * POST /api/medicinas/actualizar
 */
router.post('/actualizar', async (req, res) => {
  try {
    const { usuario_id, medicina_id, medicina } = req.body;
    
    if (!usuario_id || !medicina_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y medicina son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.actualizarMedicina(
      medicina_id, 
      usuario_id, 
      medicina
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Eliminar medicina
 * POST /api/medicinas/eliminar
 */
router.post('/eliminar', async (req, res) => {
  try {
    const { usuario_id, medicina_id } = req.body;
    
    if (!usuario_id || !medicina_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y medicina son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.eliminarMedicina(medicina_id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eliminar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE SEGUIMIENTO ====================

/**
 * 7. Marcar medicina como tomada
 * POST /api/medicinas/marcar-tomada
 */
router.post('/marcar-tomada', async (req, res) => {
  try {
    const { usuario_id, medicina_id, fecha_toma, horario, observaciones } = req.body;
    
    if (!usuario_id || !medicina_id || !horario) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario, medicina y horario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.marcarMedicinaTomada(medicina_id, usuario_id, {
      fecha_toma,
      horario,
      observaciones
    });
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_ACCESO' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /marcar-tomada:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 8. Obtener registros de medicinas
 * POST /api/medicinas/registros
 */
router.post('/registros', async (req, res) => {
  try {
    const { usuario_id, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerRegistrosMedicina(
      usuario_id, 
      fecha_inicio, 
      fecha_fin
    );
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /registros:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE CONSULTAS ====================

/**
 * 9. Obtener medicinas por frecuencia
 * POST /api/medicinas/por-frecuencia
 */
router.post('/por-frecuencia', async (req, res) => {
  try {
    const { usuario_id, frecuencia } = req.body;
    
    if (!usuario_id || !frecuencia) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y frecuencia son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.obtenerMedicinasPorFrecuencia(
      usuario_id, 
      frecuencia
    );
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /por-frecuencia:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Obtener estadísticas de medicinas
 * POST /api/medicinas/estadisticas
 */
router.post('/estadisticas', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerEstadisticasMedicinas(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /estadisticas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 11. Actualizar stock de medicina
 * POST /api/medicinas/actualizar-stock
 */
router.post('/actualizar-stock', async (req, res) => {
  try {
    const { usuario_id, medicina_id, nuevo_stock } = req.body;
    
    if (!usuario_id || !medicina_id || nuevo_stock === undefined) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await medicinasControlador.actualizarStockMedicina(
      medicina_id, 
      usuario_id, 
      nuevo_stock
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-stock:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 12. Obtener medicinas con stock bajo
 * POST /api/medicinas/stock-bajo
 */
router.post('/stock-bajo', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerMedicinasStockBajo(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /stock-bajo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 13. Buscar medicinas
 * POST /api/medicinas/buscar
 */
router.post('/buscar', async (req, res) => {
  try {
    const { usuario_id, busqueda } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    if (!busqueda || busqueda.trim().length < 2) {
      return res.status(200).json({
        exito: true,
        medicinas: [],
        busqueda: busqueda || '',
        mensaje: 'Término de búsqueda muy corto'
      });
    }
    
    const resultado = await medicinasControlador.buscarMedicinas(usuario_id, busqueda);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /buscar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 14. Obtener medicamentos predefinidos
 * POST /api/medicinas/predefinidos
 */
router.post('/predefinidos', async (req, res) => {
  try {
    const resultado = await medicinasControlador.obtenerMedicamentosPredefinidos();
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /predefinidos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS ADICIONALES ====================

/**
 * 15. Obtener horarios de medicinas para hoy
 * POST /api/medicinas/horarios-hoy
 */
router.post('/horarios-hoy', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await medicinasControlador.obtenerMedicinasHoy(usuario_id);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    // Procesar horarios para la vista de tabla
    const horariosPredefinidos = [
      { id: 'manana', nombre: 'Mañana', hora: '08:00' },
      { id: 'mediodia', nombre: 'Mediodía', hora: '12:00' },
      { id: 'tarde', nombre: 'Tarde', hora: '16:00' },
      { id: 'noche', nombre: 'Noche', hora: '20:00' }
    ];
    
    const medicinasConHorarios = resultado.medicinas.map(medicina => {
      const horariosDetalle = horariosPredefinidos.map(horario => ({
        ...horario,
        tiene: medicina.horarios.includes(horario.id),
        tomado: medicina.horarios_tomados_hoy?.includes(horario.id) || false
      }));
      
      return {
        ...medicina,
        horarios_detalle: horariosDetalle
      };
    });
    
    res.status(200).json({
      exito: true,
      medicinas: medicinasConHorarios,
      horarios: horariosPredefinidos,
      fecha: resultado.hoy,
      total: resultado.medicinas.length
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /horarios-hoy:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 16. Obtener resumen de medicinas por día
 * POST /api/medicinas/resumen-diario
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
    
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    const diaSemana = new Date(fechaConsulta).getDay();
    
    // Obtener todas las medicinas
    const todasResult = await medicinasControlador.obtenerTodasMedicinas(usuario_id);
    
    if (!todasResult.exito) {
      return res.status(400).json(todasResult);
    }
    
    // Filtrar medicinas para este día
    const medicinasParaDia = todasResult.medicinas.filter(medicina => {
      // Medicinas diarias siempre se toman
      if (medicina.frecuencia === 'diaria') return true;
      
      // Medicinas semanales según día
      if (medicina.frecuencia === 'semanal' && medicina.dias_semana?.includes(diaSemana)) {
        return true;
      }
      
      // Medicinas con fecha específica
      if (medicina.frecuencia === 'fecha_especifica') {
        const inicio = new Date(medicina.fecha_inicio);
        const fin = medicina.fecha_fin ? new Date(medicina.fecha_fin) : null;
        const fechaActual = new Date(fechaConsulta);
        
        if (fechaActual >= inicio && (!fin || fechaActual <= fin)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Obtener registros para esta fecha
    const registrosResult = await medicinasControlador.obtenerRegistrosMedicina(
      usuario_id,
      fechaConsulta,
      fechaConsulta
    );
    
    const registrosDia = registrosResult.exito ? registrosResult.registros : [];
    
    // Calcular cumplimiento
    const totalMedicinas = medicinasParaDia.length;
    const medicinasTomadas = registrosDia.filter(r => r.completada).length;
    const porcentajeCumplimiento = totalMedicinas > 0 
      ? Math.round((medicinasTomadas / totalMedicinas) * 100) 
      : 0;
    
    // Agrupar por horario
    const porHorario = {
      manana: medicinasParaDia.filter(m => m.horarios.includes('manana')).length,
      mediodia: medicinasParaDia.filter(m => m.horarios.includes('mediodia')).length,
      tarde: medicinasParaDia.filter(m => m.horarios.includes('tarde')).length,
      noche: medicinasParaDia.filter(m => m.horarios.includes('noche')).length
    };
    
    res.status(200).json({
      exito: true,
      resumen: {
        fecha: fechaConsulta,
        total_medicinas: totalMedicinas,
        medicinas_tomadas: medicinasTomadas,
        porcentaje_cumplimiento: porcentajeCumplimiento,
        por_horario: porHorario,
        medicinas: medicinasParaDia,
        registros: registrosDia
      },
      mensaje: 'Resumen diario obtenido correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /resumen-diario:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 17. Generar reporte de medicinas
 * POST /api/medicinas/generar-reporte
 */
router.post('/generar-reporte', async (req, res) => {
  try {
    const { usuario_id, tipo_reporte, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener estadísticas
    const estadisticasResult = await medicinasControlador.obtenerEstadisticasMedicinas(usuario_id);
    
    if (!estadisticasResult.exito) {
      return res.status(400).json(estadisticasResult);
    }
    
    // Obtener medicinas
    const medicinasResult = await medicinasControlador.obtenerTodasMedicinas(usuario_id);
    
    if (!medicinasResult.exito) {
      return res.status(400).json(medicinasResult);
    }
    
    // Obtener registros del período
    const registrosResult = await medicinasControlador.obtenerRegistrosMedicina(
      usuario_id,
      fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fecha_fin || new Date().toISOString().split('T')[0]
    );
    
    const registros = registrosResult.exito ? registrosResult.registros : [];
    
    // Obtener medicinas con stock bajo
    const stockBajoResult = await medicinasControlador.obtenerMedicinasStockBajo(usuario_id);
    const medicinasStockBajo = stockBajoResult.exito ? stockBajoResult.medicinas : [];
    
    // Construir reporte
    const reporte = {
      tipo: tipo_reporte || 'completo',
      fecha_generacion: new Date().toISOString(),
      periodo: {
        inicio: fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fin: fecha_fin || new Date().toISOString().split('T')[0]
      },
      estadisticas: estadisticasResult.estadisticas,
      medicinas: medicinasResult.medicinas,
      cumplimiento: {
        total_registros: registros.length,
        registros_completados: registros.filter(r => r.completada).length,
        porcentaje_completado: registros.length > 0 
          ? Math.round((registros.filter(r => r.completada).length / registros.length) * 100) 
          : 0
      },
      alertas: {
        stock_bajo: medicinasStockBajo.length,
        medicinas_agotadas: medicinasStockBajo.filter(m => m.stock_actual <= 0).length
      }
    };
    
    res.status(200).json({
      exito: true,
      reporte,
      mensaje: 'Reporte generado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /generar-reporte:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 18. Sincronizar medicinas
 * POST /api/medicinas/sincronizar
 */
router.post('/sincronizar', async (req, res) => {
  try {
    const { usuario_id, cambios } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Esta ruta manejaría sincronización offline
    // Por ahora, solo procesamos algunos cambios simulados
    
    let cambiosProcesados = 0;
    let errores = [];
    
    if (cambios && Array.isArray(cambios)) {
      for (const cambio of cambios) {
        try {
          switch (cambio.tipo) {
            case 'crear_medicina':
              await medicinasControlador.crearMedicina(usuario_id, cambio.datos);
              cambiosProcesados++;
              break;
              
            case 'marcar_tomada':
              await medicinasControlador.marcarMedicinaTomada(
                cambio.medicina_id,
                usuario_id,
                cambio.datos
              );
              cambiosProcesados++;
              break;
              
            case 'actualizar_stock':
              await medicinasControlador.actualizarStockMedicina(
                cambio.medicina_id,
                usuario_id,
                cambio.nuevo_stock
              );
              cambiosProcesados++;
              break;
              
            default:
              errores.push(`Tipo de cambio no soportado: ${cambio.tipo}`);
          }
        } catch (error) {
          errores.push(`Error procesando cambio: ${error.message}`);
        }
      }
    }
    
    res.status(200).json({
      exito: true,
      sincronizacion: {
        cambios_procesados: cambiosProcesados,
        errores,
        timestamp: new Date().toISOString()
      },
      mensaje: `Sincronización completada: ${cambiosProcesados} cambios procesados`
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

export default router;