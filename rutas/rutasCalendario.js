/**
 * rutas/calendarioRutas.js - Rutas para Gestión de Calendario
 */
import express from 'express';
import * as calendarioControlador from '../controladores/calendarioControlador.js';

const router = express.Router();

// ==================== RUTAS DE CONFIGURACIÓN ====================

/**
 * 1. Obtener configuración del calendario
 * POST /api/calendario/configuracion
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
    
    const resultado = await calendarioControlador.obtenerConfiguracionCalendario(usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
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
 * 2. Guardar configuración del calendario
 * POST /api/calendario/guardar-configuracion
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
    
    const resultado = await calendarioControlador.guardarConfiguracionCalendario(usuario_id, configuracion);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
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

// ==================== RUTAS DE EVENTOS ====================

/**
 * 3. Obtener todos los eventos
 * POST /api/calendario/eventos
 */
router.post('/eventos', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventos(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 4. Obtener eventos por rango de fechas
 * POST /api/calendario/eventos-rango
 */
router.post('/eventos-rango', async (req, res) => {
  try {
    const { usuario_id, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y fechas de inicio/fin son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventosPorRango(usuario_id, fecha_inicio, fecha_fin);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'FECHA_FORMATO_INVALIDO' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos-rango:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 5. Obtener eventos por fecha específica
 * POST /api/calendario/eventos-fecha
 */
router.post('/eventos-fecha', async (req, res) => {
  try {
    const { usuario_id, fecha } = req.body;
    
    if (!usuario_id || !fecha) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y fecha son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventosPorFecha(usuario_id, fecha);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos-fecha:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Obtener eventos próximos
 * POST /api/calendario/eventos-proximos
 */
router.post('/eventos-proximos', async (req, res) => {
  try {
    const { usuario_id, limite } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventosProximos(usuario_id, limite || 10);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos-proximos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 7. Crear evento
 * POST /api/calendario/crear-evento
 */
router.post('/crear-evento', async (req, res) => {
  try {
    const { usuario_id, evento } = req.body;
    
    if (!usuario_id || !evento) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del evento son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.crearEvento(usuario_id, evento);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'SIN_ACCESO' ? 403 :
                       resultado.codigo === 'FAMILIAR_NO_VALIDO' ? 400 :
                       resultado.codigo === 'FECHAS_INVALIDAS' ? 400 :
                       resultado.codigo === 'CONFLICTO_HORARIO' ? 409 :
                       resultado.codigo === 'EVENTO_DUPLICADO' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /crear-evento:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 8. Actualizar evento
 * PUT /api/calendario/actualizar-evento/:id
 */
router.put('/actualizar-evento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, evento } = req.body;
    
    if (!id || !usuario_id || !evento) {
      return res.status(400).json({
        exito: false,
        error: 'ID de evento, usuario y datos de actualización son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.actualizarEvento(id, usuario_id, evento);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'EVENTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'SIN_PERMISOS' ? 403 :
                       resultado.codigo === 'SIN_CAMPOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-evento:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 9. Eliminar evento
 * DELETE /api/calendario/eliminar-evento/:id
 */
router.delete('/eliminar-evento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    
    if (!id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de evento y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.eliminarEvento(id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'EVENTO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eliminar-evento:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Obtener eventos por tipo
 * POST /api/calendario/eventos-tipo
 */
router.post('/eventos-tipo', async (req, res) => {
  try {
    const { usuario_id, tipo } = req.body;
    
    if (!usuario_id || !tipo) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y tipo de evento son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventosPorTipo(usuario_id, tipo);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos-tipo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 11. Obtener eventos de hoy
 * POST /api/calendario/eventos-hoy
 */
router.post('/eventos-hoy', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await calendarioControlador.obtenerEventosHoy(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /eventos-hoy:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ESTADÍSTICAS Y BUSQUEDA ====================

/**
 * 12. Obtener estadísticas de eventos
 * POST /api/calendario/estadisticas
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
    
    const resultado = await calendarioControlador.obtenerEstadisticasEventos(
      usuario_id, 
      fecha_inicio, 
      fecha_fin
    );
    
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
 * 13. Buscar eventos
 * POST /api/calendario/buscar-eventos
 */
router.post('/buscar-eventos', async (req, res) => {
  try {
    const { usuario_id, busqueda } = req.body;
    
    if (!usuario_id || !busqueda) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y término de búsqueda son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await calendarioControlador.buscarEventos(usuario_id, busqueda);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /buscar-eventos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE UTILIDADES ====================

/**
 * 14. Obtener tipos de eventos predefinidos
 * GET /api/calendario/tipos-eventos
 */
router.get('/tipos-eventos', async (req, res) => {
  try {
    const resultado = await calendarioControlador.obtenerTiposEventosPredefinidos();
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /tipos-eventos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 15. Obtener cumpleaños de familiares
 * POST /api/calendario/cumpleanos
 */
router.post('/cumpleanos', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await calendarioControlador.obtenerCumpleanosFamiliares(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /cumpleanos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 16. Obtener resumen del calendario
 * POST /api/calendario/resumen
 */
router.post('/resumen', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener múltiples datos en paralelo
    const [
      eventosProximosResult,
      eventosHoyResult,
      cumpleanosResult,
      estadisticasResult,
      configuracionResult
    ] = await Promise.all([
      calendarioControlador.obtenerEventosProximos(usuario_id, 5),
      calendarioControlador.obtenerEventosHoy(usuario_id),
      calendarioControlador.obtenerCumpleanosFamiliares(usuario_id),
      calendarioControlador.obtenerEstadisticasEventos(usuario_id),
      calendarioControlador.obtenerConfiguracionCalendario(usuario_id)
    ]);
    
    // Preparar resumen consolidado
    const resumen = {
      eventos_proximos: eventosProximosResult.exito ? eventosProximosResult.eventos : [],
      eventos_hoy: eventosHoyResult.exito ? eventosHoyResult.eventos : [],
      total_eventos_hoy: eventosHoyResult.exito ? eventosHoyResult.total : 0,
      proximos_cumpleanos: cumpleanosResult.exito ? cumpleanosResult.cumpleanos.slice(0, 3) : [],
      total_cumpleanos_proximos: cumpleanosResult.exito ? cumpleanosResult.cumpleanos.length : 0,
      estadisticas: estadisticasResult.exito ? estadisticasResult.estadisticas : {},
      configuracion: configuracionResult.exito ? configuracionResult.configuracion : null
    };
    
    // Calcular eventos por venir en los próximos 7 días
    const hoy = new Date();
    const proximaSemana = new Date();
    proximaSemana.setDate(hoy.getDate() + 7);
    
    const eventosSemanaResult = await calendarioControlador.obtenerEventosPorRango(
      usuario_id,
      hoy.toISOString().split('T')[0],
      proximaSemana.toISOString().split('T')[0]
    );
    
    if (eventosSemanaResult.exito) {
      resumen.eventos_proxima_semana = eventosSemanaResult.eventos.length;
      resumen.dias_con_eventos = new Set(
        eventosSemanaResult.eventos.map(e => e.fecha_inicio)
      ).size;
    }
    
    console.log('✅ Resumen del calendario generado');
    
    res.status(200).json({
      exito: true,
      resumen,
      fecha_generacion: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /resumen:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 17. Exportar calendario a diferentes formatos
 * POST /api/calendario/exportar
 */
router.post('/exportar', async (req, res) => {
  try {
    const { usuario_id, formato, fecha_inicio, fecha_fin } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener eventos en el rango especificado
    const fechaInicio = fecha_inicio || new Date().toISOString().split('T')[0];
    const fechaFin = fecha_fin || fechaInicio;
    
    const eventosResult = await calendarioControlador.obtenerEventosPorRango(
      usuario_id,
      fechaInicio,
      fechaFin
    );
    
    if (!eventosResult.exito) {
      return res.status(400).json(eventosResult);
    }
    
    // Obtener configuración
    const configuracionResult = await calendarioControlador.obtenerConfiguracionCalendario(usuario_id);
    
    // Preparar datos para exportación
    const datosExportacion = {
      eventos: eventosResult.eventos,
      configuracion: configuracionResult.exito ? configuracionResult.configuracion : null,
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin,
        total_eventos: eventosResult.total
      },
      fecha_exportacion: new Date().toISOString()
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    res.status(200).json({
      exito: true,
      datos: datosExportacion,
      formato: formato || 'json',
      nombre_archivo: `calendario_${timestamp}.${formato || 'json'}`,
      mensaje: 'Datos del calendario listos para exportación'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /exportar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 18. Verificar conflictos de horario
 * POST /api/calendario/verificar-conflictos
 */
router.post('/verificar-conflictos', async (req, res) => {
  try {
    const { usuario_id, evento } = req.body;
    
    if (!usuario_id || !evento) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del evento son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    // Obtener eventos existentes en el rango de fechas
    const fechaInicio = evento.fecha_inicio;
    const fechaFin = evento.fecha_fin || evento.fecha_inicio;
    
    const eventosExistentes = await calendarioControlador.obtenerEventosPorRango(
      usuario_id,
      fechaInicio,
      fechaFin
    );
    
    if (!eventosExistentes.exito) {
      return res.status(400).json(eventosExistentes);
    }
    
    // Verificar conflictos
    const conflictos = [];
    const eventoInicio = new Date(`${fechaInicio}T${evento.hora_inicio || '00:00'}`);
    const eventoFin = new Date(`${fechaFin}T${evento.hora_fin || '23:59'}`);
    
    eventosExistentes.eventos.forEach(eventoExistente => {
      // Excluir el mismo evento si estamos editando
      if (evento.id && eventoExistente.id === evento.id) {
        return;
      }
      
      const existenteInicio = new Date(`${eventoExistente.fecha_inicio}T${eventoExistente.hora_inicio || '00:00'}`);
      const existenteFin = new Date(`${eventoExistente.fecha_fin}T${eventoExistente.hora_fin || '23:59'}`);
      
      // Verificar superposición
      if (
        (eventoInicio >= existenteInicio && eventoInicio < existenteFin) ||
        (eventoFin > existenteInicio && eventoFin <= existenteFin) ||
        (eventoInicio <= existenteInicio && eventoFin >= existenteFin)
      ) {
        conflictos.push({
          id: eventoExistente.id,
          titulo: eventoExistente.titulo,
          tipo_evento: eventoExistente.tipo_evento,
          fecha_inicio: eventoExistente.fecha_inicio,
          hora_inicio: eventoExistente.hora_inicio,
          fecha_fin: eventoExistente.fecha_fin,
          hora_fin: eventoExistente.hora_fin,
          adulto_mayor_nombre: eventoExistente.adulto_mayor_nombre
        });
      }
    });
    
    res.status(200).json({
      exito: true,
      tiene_conflictos: conflictos.length > 0,
      conflictos: conflictos,
      total_conflictos: conflictos.length,
      recomendacion: conflictos.length > 0 
        ? 'Considera ajustar el horario para evitar conflictos'
        : 'No hay conflictos de horario'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /verificar-conflictos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 19. Sincronizar calendario
 * POST /api/calendario/sincronizar
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
    
    console.log('🔄 Sincronizando calendario para usuario:', usuario_id);
    
    // Aquí implementarías la lógica de sincronización
    // Por ahora, devolvemos un estado básico
    
    res.status(200).json({
      exito: true,
      sincronizado_en: new Date().toISOString(),
      cambios_aplicados: 0,
      eventos_agregados: 0,
      eventos_actualizados: 0,
      eventos_eliminados: 0,
      mensaje: 'Sincronización del calendario completada (modo de demostración)'
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
 * GET /api/calendario/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    exito: true,
    mensaje: 'API de Calendario funcionando correctamente',
    version: '1.0.0',
    fecha: new Date().toISOString()
  });
});

// ==================== RUTAS PARA NOTIFICACIONES DE EVENTOS ====================

/**
 * 21. Obtener recordatorios de eventos
 * POST /api/calendario/recordatorios
 */
router.post('/recordatorios', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener eventos próximos con recordatorio activado
    const eventosProximosResult = await calendarioControlador.obtenerEventosProximos(usuario_id, 20);
    
    if (!eventosProximosResult.exito) {
      return res.status(400).json(eventosProximosResult);
    }
    
    // Filtrar eventos con recordatorio
    const ahora = new Date();
    const recordatorios = [];
    
    eventosProximosResult.eventos.forEach(evento => {
      if (evento.recordatorio && evento.recordatorio_minutos) {
        const fechaEvento = new Date(`${evento.fecha_inicio}T${evento.hora_inicio || '09:00'}`);
        const fechaRecordatorio = new Date(fechaEvento);
        fechaRecordatorio.setMinutes(fechaRecordatorio.getMinutes() - evento.recordatorio_minutos);
        
        // Solo incluir recordatorios que aún no han pasado
        if (fechaRecordatorio > ahora) {
          const minutosRestantes = Math.ceil((fechaRecordatorio - ahora) / (1000 * 60));
          const horasRestantes = Math.ceil(minutosRestantes / 60);
          const diasRestantes = Math.ceil(minutosRestantes / (60 * 24));
          
          let tipoRecordatorio = 'pronto';
          if (diasRestantes > 1) {
            tipoRecordatorio = 'futuro';
          } else if (minutosRestantes <= 60) {
            tipoRecordatorio = 'inminente';
          }
          
          recordatorios.push({
            evento_id: evento.id,
            titulo: evento.titulo,
            tipo_evento: evento.tipo_evento,
            fecha_evento: evento.fecha_inicio,
            hora_evento: evento.hora_inicio,
            fecha_recordatorio: fechaRecordatorio.toISOString(),
            minutos_restantes: minutosRestantes,
            tipo_recordatorio: tipoRecordatorio,
            mensaje: `Recordatorio: ${evento.titulo} en ${minutosRestantes} minutos`
          });
        }
      }
    });
    
    // Ordenar por proximidad
    recordatorios.sort((a, b) => a.minutos_restantes - b.minutos_restantes);
    
    console.log(`✅ Encontrados ${recordatorios.length} recordatorios activos`);
    
    res.status(200).json({
      exito: true,
      recordatorios,
      total: recordatorios.length,
      proximo_recordatorio: recordatorios.length > 0 ? recordatorios[0] : null,
      fecha_consulta: ahora.toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /recordatorios:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== EXPORTACIÓN ====================

export default router;