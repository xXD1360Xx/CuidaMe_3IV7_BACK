// rutas/horarioRutas.js - Rutas para Gestión de Horarios (actualizado)
import express from 'express';
import * as horarioControlador from '../controladores/horarioControlador.js';
import { autenticarUsuario } from '../middleware/autenticacionMiddleware.js';

const router = express.Router();

// ============================================================
//  CONFIGURACIÓN
// ============================================================

router.post('/configuracion', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerConfiguracionHorario(usuario_id);
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json({ exito: true, configuracion: resultado.configuracion });
  } catch (error) {
    console.error('❌ Error en /configuracion:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/guardar-configuracion', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, configuracion } = req.body;
    if (!usuario_id || !configuracion) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.guardarConfiguracionHorario(usuario_id, configuracion);
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 : resultado.codigo === 'ADULTO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /guardar-configuracion:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

// ============================================================
//  ACTIVIDADES BASE (nombre, tipo, color, descripción)
// ============================================================

/**
 * Obtener todas las actividades base (agrupadas por nombre/tipo/color/desc)
 */
router.post('/actividades-base', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerActividadesBase(usuario_id);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-base:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Crear una nueva actividad base
 */
router.post('/actividades-base/crear', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, ...datos } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.crearActividadBase(usuario_id, datos);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(201).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-base/crear:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Actualizar una actividad base (por ID)
 */
router.put('/actividades-base/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const resultado = await horarioControlador.actualizarActividadBase(id, datos);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-base/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Eliminar una actividad base (y todas sus ocurrencias)
 */
router.delete('/actividades-base/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await horarioControlador.eliminarActividadBase(id);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-base/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

// ============================================================
//  OCURRENCIAS (horarios con días, hora inicio/fin, duración)
// ============================================================

/**
 * Obtener ocurrencias en un rango de fechas
 */
router.post('/ocurrencias/rango', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, fecha_inicio, fecha_fin } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerOcurrenciasPorRango(usuario_id, fecha_inicio, fecha_fin);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /ocurrencias/rango:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Crear una nueva ocurrencia
 */
router.post('/ocurrencias/crear', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, ...datos } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.crearOcurrencia(usuario_id, datos);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(201).json(resultado);
  } catch (error) {
    console.error('❌ Error en /ocurrencias/crear:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Actualizar una ocurrencia existente
 */
router.put('/ocurrencias/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const resultado = await horarioControlador.actualizarOcurrencia(id, datos);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /ocurrencias/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

/**
 * Eliminar una ocurrencia
 */
router.delete('/ocurrencias/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await horarioControlador.eliminarOcurrencia(id);
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /ocurrencias/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

// ============================================================
//  RUTAS EXISTENTES (sin cambios, pero usando autenticación por token)
// ============================================================

router.post('/actividades-fijas', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerActividadesFijas(usuario_id);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-fijas:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/crear-actividad', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, actividad } = req.body;
    if (!usuario_id || !actividad) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
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
    console.error('❌ Error en /crear-actividad:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.put('/actualizar-actividad/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, actividad } = req.body;
    if (!id || !usuario_id || !actividad) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.actualizarActividad(id, usuario_id, actividad);
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
        resultado.codigo === 'SIN_PERMISOS' ? 403 :
          resultado.codigo === 'SIN_CAMPOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actualizar-actividad/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.delete('/eliminar-actividad/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    if (!id || !usuario_id) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.eliminarActividad(id, usuario_id);
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
        resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /eliminar-actividad/:id:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/actividades-fecha', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, fecha } = req.body;
    if (!usuario_id || !fecha) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.obtenerActividadesPorFecha(usuario_id, fecha);
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'FECHA_FORMATO_INVALIDO' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-fecha:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/actividades-hoy', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerActividadesHoy(usuario_id);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-hoy:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/actividades-tipo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, tipo } = req.body;
    if (!usuario_id || !tipo) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.obtenerActividadesPorTipo(usuario_id, tipo);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-tipo:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/actividades-semana', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, fecha_inicio } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerActividadesSemana(usuario_id, fecha_inicio);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-semana:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/registrar-actividad', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, actividad_id, fecha, completada, observaciones } = req.body;
    if (!usuario_id || !actividad_id) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.registrarActividadRealizada(usuario_id, {
      actividad_id,
      fecha,
      completada,
      observaciones
    });
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
        resultado.codigo === 'ACTIVIDAD_NO_ENCONTRADA' ? 404 :
          resultado.codigo === 'SIN_ACCESO' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /registrar-actividad:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/resumen-diario', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, fecha } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const resultado = await horarioControlador.obtenerResumenDiario(usuario_id, fecha);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /resumen-diario:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/buscar-conflictos', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, dias, hora_inicio, hora_fin, actividad_id } = req.body;
    if (!usuario_id || !dias || !hora_inicio || !hora_fin) return res.status(400).json({ exito: false, error: 'Datos incompletos' });
    const resultado = await horarioControlador.buscarConflictosHorario(usuario_id, { dias, hora_inicio, hora_fin, actividad_id });
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /buscar-conflictos:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.get('/actividades-predeifinidas', autenticarUsuario, async (req, res) => {
  try {
    const resultado = await horarioControlador.obtenerActividadesPredefinidas();
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error en /actividades-predeifinidas:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/estadisticas', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, fecha_inicio, fecha_fin } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const actividadesResult = await horarioControlador.obtenerActividadesFijas(usuario_id);
    if (!actividadesResult.exito) return res.status(500).json(actividadesResult);
    const resumenSemanaResult = await horarioControlador.obtenerResumenDiario(usuario_id);
    const actividades = actividadesResult.actividades || [];
    const estadisticas = {
      total_actividades: actividades.length,
      por_tipo: actividades.reduce((acc, act) => {
        if (!acc[act.tipo]) acc[act.tipo] = 0;
        acc[act.tipo]++;
        return acc;
      }, {}),
      por_dia: actividades.reduce((acc, act) => {
        if (act.dias && Array.isArray(act.dias)) {
          act.dias.forEach(dia => {
            if (!acc[dia]) acc[dia] = 0;
            acc[dia]++;
          });
        }
        return acc;
      }, {}),
      total_recurrentes: actividades.filter(a => a.esRecurrente).length,
      total_no_recurrentes: actividades.filter(a => !a.esRecurrente).length,
      resumen_hoy: resumenSemanaResult.exito ? resumenSemanaResult.resumen : null
    };
    res.status(200).json({ exito: true, estadisticas });
  } catch (error) {
    console.error('❌ Error en /estadisticas:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/exportar-pdf', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    const configResult = await horarioControlador.obtenerConfiguracionHorario(usuario_id);
    if (!configResult.exito) return res.status(404).json(configResult);
    const actividadesResult = await horarioControlador.obtenerActividadesFijas(usuario_id);
    const resumenResult = await horarioControlador.obtenerResumenDiario(usuario_id);
    const datosExportacion = {
      configuracion: configResult.configuracion,
      actividades: actividadesResult.exito ? actividadesResult.actividades : [],
      resumen: resumenResult.exito ? resumenResult.resumen : {},
      fecha_generacion: new Date().toISOString()
    };
    res.status(200).json({
      exito: true,
      datos: datosExportacion,
      formato: 'pdf',
      nombre_archivo: `horario_${Date.now()}.pdf`,
      mensaje: 'Horario listo para exportar a PDF'
    });
  } catch (error) {
    console.error('❌ Error en /exportar-pdf:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.post('/sincronizar', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;
    if (!usuario_id) return res.status(400).json({ exito: false, error: 'ID de usuario requerido' });
    // Lógica de sincronización (placeholder)
    res.status(200).json({ exito: true, sincronizado_en: new Date().toISOString(), cambios_aplicados: 0 });
  } catch (error) {
    console.error('❌ Error en /sincronizar:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
});

router.get('/status', (req, res) => {
  res.status(200).json({ exito: true, mensaje: 'API de Horario funcionando correctamente' });
});

export default router;