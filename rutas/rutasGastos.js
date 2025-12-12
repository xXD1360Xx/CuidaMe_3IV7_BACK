/**
 * rutas/gastosRutas.js - Rutas para Gestión de Gastos y Distribuciones
 */
import express from 'express';
import * as gastosControlador from '../controladores/gastosControlador.js';

const router = express.Router();

// ==================== RUTAS DE GASTOS - CRUD BÁSICO ====================

/**
 * 1. Crear nuevo gasto
 * POST /api/gastos/crear
 */
router.post('/crear', async (req, res) => {
  try {
    const { usuario_id, datos_gasto } = req.body;
    
    if (!usuario_id || !datos_gasto) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del gasto son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.crearGasto(usuario_id, datos_gasto);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'MONTO_INVALIDO' ? 400 :
                       resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'GASTO_DUPLICADO' ? 409 : 500;
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
 * 2. Obtener gastos futuros
 * POST /api/gastos/futuros
 */
router.post('/futuros', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerGastosFuturos(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /futuros:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 3. Obtener gastos del mes actual
 * POST /api/gastos/mes-actual
 */
router.post('/mes-actual', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerGastosMesActual(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /mes-actual:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 4. Obtener gastos pasados (historial)
 * POST /api/gastos/historial
 */
router.post('/historial', async (req, res) => {
  try {
    const { usuario_id, limite } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerGastosPasados(usuario_id, limite || 50);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /historial:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 5. Obtener gasto por ID
 * POST /api/gastos/detalle
 */
router.post('/detalle', async (req, res) => {
  try {
    const { usuario_id, gasto_id } = req.body;
    
    if (!usuario_id || !gasto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y ID de gasto son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.obtenerGastoPorId(gasto_id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'GASTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /detalle:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Actualizar gasto
 * PUT /api/gastos/actualizar/:id
 */
router.put('/actualizar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, datos_actualizacion } = req.body;
    
    if (!id || !usuario_id || !datos_actualizacion) {
      return res.status(400).json({
        exito: false,
        error: 'ID de gasto, usuario y datos de actualización son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.actualizarGasto(id, usuario_id, datos_actualizacion);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
                       resultado.codigo === 'SIN_CAMPOS' ? 400 : 500;
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
 * 7. Eliminar gasto (soft delete)
 * DELETE /api/gastos/eliminar/:id
 */
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    
    if (!id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de gasto y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.eliminarGasto(id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
                       resultado.codigo === 'GASTO_NO_ENCONTRADO' ? 404 : 500;
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

/**
 * 8. Marcar gasto como pagado
 * POST /api/gastos/marcar-pagado/:id
 */
router.post('/marcar-pagado/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    
    if (!id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de gasto y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.marcarGastoPagado(id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /marcar-pagado:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE DISTRIBUCIONES Y PORCENTAJES ====================

/**
 * 9. Obtener distribución de porcentajes
 * POST /api/gastos/distribucion
 */
router.post('/distribucion', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerDistribucionPorcentajes(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /distribucion:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Guardar distribución de porcentajes
 * POST /api/gastos/guardar-distribucion
 */
router.post('/guardar-distribucion', async (req, res) => {
  try {
    const { usuario_id, porcentajes } = req.body;
    
    if (!usuario_id || !porcentajes) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y porcentajes son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.guardarDistribucionPorcentajes(usuario_id, porcentajes);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'FORMATO_INVALIDO' ? 400 :
                       resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'NO_ADMIN' ? 403 :
                       resultado.codigo === 'PORCENTAJE_INVALIDO' ? 400 :
                       resultado.codigo === 'DATOS_INVALIDOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /guardar-distribucion:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE APORTES Y PAGOS ====================

/**
 * 11. Obtener aportes del mes actual
 * POST /api/gastos/aportes-mes
 */
router.post('/aportes-mes', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerAportesMesActual(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /aportes-mes:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 12. Registrar aporte a gasto
 * POST /api/gastos/registrar-aporte/:gasto_id
 */
router.post('/registrar-aporte/:gasto_id', async (req, res) => {
  try {
    const { gasto_id } = req.params;
    const { usuario_id, monto, notas } = req.body;
    
    if (!gasto_id || !usuario_id || !monto) {
      return res.status(400).json({
        exito: false,
        error: 'ID de gasto, usuario y monto son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.registrarAporteGasto(gasto_id, usuario_id, monto, notas);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'MONTO_INVALIDO' ? 400 :
                       resultado.codigo === 'GASTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'SIN_PERMISOS' ? 403 :
                       resultado.codigo === 'GASTO_CUBIERTO' ? 409 :
                       resultado.codigo === 'APORTE_EXCEDENTE' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /registrar-aporte:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 13. Obtener familiares del adulto mayor
 * POST /api/gastos/familiares
 */
router.post('/familiares', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.obtenerFamiliares(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /familiares:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE CÁLCULOS Y REPORTES ====================

/**
 * 14. Calcular distribución sugerida
 * POST /api/gastos/distribucion-sugerida
 */
router.post('/distribucion-sugerida', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.calcularDistribucionSugerida(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /distribucion-sugerida:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 15. Generar reporte de gastos
 * POST /api/gastos/generar-reporte
 */
router.post('/generar-reporte', async (req, res) => {
  try {
    const { usuario_id, tipo_reporte, filtros } = req.body;
    
    if (!usuario_id || !tipo_reporte) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y tipo de reporte son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await gastosControlador.generarReporteGastos(usuario_id, tipo_reporte, filtros || {});
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'TIPO_REPORTE_INVALIDO' ? 400 :
                       resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
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
 * 16. Verificar permisos de administrador
 * POST /api/gastos/verificar-admin
 */
router.post('/verificar-admin', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await gastosControlador.verificarEsAdministrador(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /verificar-admin:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 17. Obtener estadísticas resumen
 * POST /api/gastos/estadisticas
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
    
    const resultado = await gastosControlador.obtenerEstadisticasResumen(usuario_id);
    
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

// ==================== RUTAS DE EXPORTACIÓN Y UTILIDADES ====================

/**
 * 18. Exportar reporte a PDF/Excel
 * POST /api/gastos/exportar-reporte
 */
router.post('/exportar-reporte', async (req, res) => {
  try {
    const { usuario_id, tipo_reporte, formato, filtros } = req.body;
    
    if (!usuario_id || !tipo_reporte) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y tipo de reporte son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    // Obtener datos del reporte
    const reporteResultado = await gastosControlador.generarReporteGastos(usuario_id, tipo_reporte, filtros || {});
    
    if (!reporteResultado.exito) {
      const statusCode = reporteResultado.codigo === 'TIPO_REPORTE_INVALIDO' ? 400 :
                       reporteResultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(reporteResultado);
    }
    
    // En un sistema real, aquí generarías el PDF o Excel
    // Por ahora, devolvemos los datos para que el frontend los maneje
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    res.status(200).json({
      exito: true,
      datos: reporteResultado.reporte,
      formato: formato || 'json',
      nombre_archivo: `reporte_gastos_${tipo_reporte}_${timestamp}.${formato || 'json'}`,
      metadata: {
        tipo_reporte,
        total_registros: reporteResultado.total_registros,
        fecha_generacion: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /exportar-reporte:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 19. Sincronizar datos de gastos
 * POST /api/gastos/sincronizar
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
    
    console.log('🔄 Sincronizando gastos para usuario:', usuario_id);
    
    res.status(200).json({
      exito: true,
      sincronizado_en: new Date().toISOString(),
      cambios_aplicados: 0,
      mensaje: 'Sincronización de gastos completada (modo de demostración)'
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

/**
 * 20. Ruta de prueba
 * GET /api/gastos/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    exito: true,
    mensaje: 'API de Gastos funcionando correctamente',
    version: '1.0.0',
    fecha: new Date().toISOString()
  });
});

// ==================== RUTAS PARA NOTIFICACIONES ====================

/**
 * 21. Obtener notificaciones de gastos pendientes
 * POST /api/gastos/notificaciones-pendientes
 */
router.post('/notificaciones-pendientes', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener gastos futuros
    const gastosResultado = await gastosControlador.obtenerGastosFuturos(usuario_id);
    
    if (!gastosResultado.exito) {
      return res.status(500).json(gastosResultado);
    }
    
    // Filtrar gastos pendientes (no cubiertos)
    const gastosPendientes = gastosResultado.gastos.filter(gasto => {
      const totalAportado = parseFloat(gasto.total_aportado || 0);
      const monto = parseFloat(gasto.monto || 0);
      return totalAportado < monto && gasto.estado !== 'pagado';
    });
    
    // Calcular prioridades
    const notificaciones = gastosPendientes.map(gasto => {
      const totalAportado = parseFloat(gasto.total_aportado || 0);
      const monto = parseFloat(gasto.monto || 0);
      const saldoPendiente = monto - totalAportado;
      const porcentajeCubierto = monto > 0 ? (totalAportado / monto) * 100 : 0;
      
      // Determinar prioridad
      let prioridad = 'baja';
      if (saldoPendiente > 1000 || porcentajeCubierto < 20) {
        prioridad = 'alta';
      } else if (saldoPendiente > 500 || porcentajeCubierto < 50) {
        prioridad = 'media';
      }
      
      // Verificar fecha de vencimiento
      const fechaGasto = new Date(gasto.fecha);
      const hoy = new Date();
      const diasRestantes = Math.ceil((fechaGasto - hoy) / (1000 * 60 * 60 * 24));
      
      let mensaje = `Gasto pendiente: ${gasto.descripcion} - $${saldoPendiente.toFixed(2)} pendientes`;
      if (diasRestantes < 3) {
        mensaje += ` (Vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''})`;
      }
      
      return {
        gasto_id: gasto.id,
        descripcion: gasto.descripcion,
        monto_total: monto,
        saldo_pendiente: saldoPendiente,
        porcentaje_cubierto: porcentajeCubierto,
        fecha: gasto.fecha,
        prioridad,
        mensaje,
        dias_restantes: diasRestantes,
        fecha_calculada: hoy.toISOString().split('T')[0]
      };
    });
    
    console.log(`✅ Encontradas ${notificaciones.length} notificaciones pendientes`);
    
    res.status(200).json({
      exito: true,
      notificaciones,
      total: notificaciones.length,
      fecha_generacion: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /notificaciones-pendientes:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== EXPORTACIÓN ====================

export default router;