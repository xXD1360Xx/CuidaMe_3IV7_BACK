// rutas/infoAdultoRutas.js - Rutas para Información del Adulto Mayor
import express from 'express';
import infoAdultoControlador from '../controladores/infoAdultoControlador.js';

const router = express.Router();

// ==================== RUTAS DE INFORMACIÓN PRINCIPAL ====================

/**
 * 1. Obtener información del adulto mayor principal
 * POST /api/info-adulto/principal
 */
router.post('/principal', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerAdultoMayorPrincipal(usuario_id);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /principal:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 2. Actualizar información del adulto mayor
 * POST /api/info-adulto/actualizar
 */
router.post('/actualizar', async (req, res) => {
  try {
    const { usuario_id, adulto_id, datos } = req.body;
    
    if (!usuario_id || !adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    if (!datos || Object.keys(datos).length === 0) {
      return res.status(400).json({
        exito: false,
        error: 'Debe proporcionar datos para actualizar',
        codigo: 'SIN_DATOS_ACTUALIZAR'
      });
    }
    
    const resultado = await infoAdultoControlador.actualizarAdultoMayor(
      adulto_id, 
      usuario_id, 
      datos
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
 * 3. Obtener estadísticas de salud
 * POST /api/info-adulto/estadisticas
 */
router.post('/estadisticas', async (req, res) => {
  try {
    const { usuario_id, adulto_id } = req.body;
    
    if (!usuario_id || !adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerEstadisticasSalud(
      adulto_id, 
      usuario_id
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_ACCESO' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
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
 * 4. Generar reporte de salud
 * POST /api/info-adulto/generar-reporte
 */
router.post('/generar-reporte', async (req, res) => {
  try {
    const { usuario_id, adulto_id, tipo } = req.body;
    
    if (!usuario_id || !adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.generarReporteSalud(
      adulto_id, 
      usuario_id, 
      tipo || 'completo'
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_ACCESO' ? 403 : 400;
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

// ==================== RUTAS DE ENFERMEDADES ====================

/**
 * 5. Obtener enfermedades
 * POST /api/info-adulto/enfermedades
 */
router.post('/enfermedades', async (req, res) => {
  try {
    const { adulto_id } = req.body;
    
    if (!adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID del adulto mayor es requerido',
        codigo: 'ADULTO_ID_REQUERIDO'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerEnfermedades(adulto_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /enfermedades:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Agregar enfermedad
 * POST /api/info-adulto/enfermedades/agregar
 */
router.post('/enfermedades/agregar', async (req, res) => {
  try {
    const { usuario_id, adulto_id, enfermedad } = req.body;
    
    if (!usuario_id || !adulto_id || !enfermedad) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.agregarEnfermedad(
      adulto_id, 
      usuario_id, 
      enfermedad
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /enfermedades/agregar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 7. Actualizar enfermedad
 * POST /api/info-adulto/enfermedades/actualizar
 */
router.post('/enfermedades/actualizar', async (req, res) => {
  try {
    const { usuario_id, enfermedad_id, datos } = req.body;
    
    if (!usuario_id || !enfermedad_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y enfermedad son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    if (!datos || Object.keys(datos).length === 0) {
      return res.status(400).json({
        exito: false,
        error: 'Debe proporcionar datos para actualizar',
        codigo: 'SIN_DATOS_ACTUALIZAR'
      });
    }
    
    const resultado = await infoAdultoControlador.actualizarEnfermedad(
      enfermedad_id, 
      usuario_id, 
      datos
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /enfermedades/actualizar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 8. Eliminar enfermedad
 * POST /api/info-adulto/enfermedades/eliminar
 */
router.post('/enfermedades/eliminar', async (req, res) => {
  try {
    const { usuario_id, enfermedad_id } = req.body;
    
    if (!usuario_id || !enfermedad_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y enfermedad son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.eliminarEnfermedad(
      enfermedad_id, 
      usuario_id
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /enfermedades/eliminar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ALERGIAS ====================

/**
 * 9. Obtener alergias
 * POST /api/info-adulto/alergias
 */
router.post('/alergias', async (req, res) => {
  try {
    const { adulto_id } = req.body;
    
    if (!adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID del adulto mayor es requerido',
        codigo: 'ADULTO_ID_REQUERIDO'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerAlergias(adulto_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /alergias:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Agregar alergia
 * POST /api/info-adulto/alergias/agregar
 */
router.post('/alergias/agregar', async (req, res) => {
  try {
    const { usuario_id, adulto_id, alergia } = req.body;
    
    if (!usuario_id || !adulto_id || !alergia) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.agregarAlergia(
      adulto_id, 
      usuario_id, 
      alergia
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /alergias/agregar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ARTÍCULOS ====================

/**
 * 11. Obtener artículos
 * POST /api/info-adulto/articulos
 */
router.post('/articulos', async (req, res) => {
  try {
    const { adulto_id } = req.body;
    
    if (!adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID del adulto mayor es requerido',
        codigo: 'ADULTO_ID_REQUERIDO'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerArticulos(adulto_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /articulos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 12. Agregar artículo
 * POST /api/info-adulto/articulos/agregar
 */
router.post('/articulos/agregar', async (req, res) => {
  try {
    const { usuario_id, adulto_id, articulo } = req.body;
    
    if (!usuario_id || !adulto_id || !articulo) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.agregarArticulo(
      adulto_id, 
      usuario_id, 
      articulo
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /articulos/agregar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE HOBBIES ====================

/**
 * 13. Obtener hobbies
 * POST /api/info-adulto/hobbies
 */
router.post('/hobbies', async (req, res) => {
  try {
    const { adulto_id } = req.body;
    
    if (!adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID del adulto mayor es requerido',
        codigo: 'ADULTO_ID_REQUERIDO'
      });
    }
    
    const resultado = await infoAdultoControlador.obtenerHobbies(adulto_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /hobbies:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 14. Agregar hobby
 * POST /api/info-adulto/hobbies/agregar
 */
router.post('/hobbies/agregar', async (req, res) => {
  try {
    const { usuario_id, adulto_id, hobby } = req.body;
    
    if (!usuario_id || !adulto_id || !hobby) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await infoAdultoControlador.agregarHobby(
      adulto_id, 
      usuario_id, 
      hobby
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /hobbies/agregar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE INFORMACIÓN RELACIONADA ====================

/**
 * 15. Obtener información completa
 * POST /api/info-adulto/completa
 */
router.post('/completa', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener información principal
    const principalResult = await infoAdultoControlador.obtenerAdultoMayorPrincipal(usuario_id);
    
    if (!principalResult.exito || !principalResult.adultoMayor) {
      return res.status(400).json(principalResult);
    }
    
    const adultoId = principalResult.adultoMayor.id;
    
    // Obtener información relacionada en paralelo
    const [
      enfermedadesResult,
      alergiasResult,
      articulosResult,
      hobbiesResult
    ] = await Promise.all([
      infoAdultoControlador.obtenerEnfermedades(adultoId),
      infoAdultoControlador.obtenerAlergias(adultoId),
      infoAdultoControlador.obtenerArticulos(adultoId),
      infoAdultoControlador.obtenerHobbies(adultoId)
    ]);
    
    // Combinar toda la información
    const informacionCompleta = {
      ...principalResult.adultoMayor,
      enfermedades: enfermedadesResult.exito ? enfermedadesResult.enfermedades : [],
      alergias: alergiasResult.exito ? alergiasResult.alergias : [],
      articulos: articulosResult.exito ? articulosResult.articulos : [],
      hobbies: hobbiesResult.exito ? hobbiesResult.hobbies : []
    };
    
    res.status(200).json({
      exito: true,
      adultoMayor: informacionCompleta,
      mensaje: 'Información completa obtenida correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /completa:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 16. Obtener resumen de salud
 * POST /api/info-adulto/resumen-salud
 */
router.post('/resumen-salud', async (req, res) => {
  try {
    const { usuario_id, adulto_id } = req.body;
    
    if (!usuario_id || !adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    // Obtener estadísticas
    const estadisticasResult = await infoAdultoControlador.obtenerEstadisticasSalud(
      adulto_id, 
      usuario_id
    );
    
    if (!estadisticasResult.exito) {
      const statusCode = estadisticasResult.codigo === 'SIN_ACCESO' ? 403 : 400;
      return res.status(statusCode).json(estadisticasResult);
    }
    
    // Obtener información relacionada
    const [
      enfermedadesResult,
      alergiasResult,
      articulosResult
    ] = await Promise.all([
      infoAdultoControlador.obtenerEnfermedades(adulto_id),
      infoAdultoControlador.obtenerAlergias(adulto_id),
      infoAdultoControlador.obtenerArticulos(adulto_id)
    ]);
    
    const resumenSalud = {
      estadisticas: estadisticasResult.estadisticas,
      enfermedades_activas: enfermedadesResult.exito ? enfermedadesResult.enfermedades : [],
      alergias_activas: alergiasResult.exito ? alergiasResult.alergias : [],
      articulos_importantes: articulosResult.exito 
        ? articulosResult.articulos.filter(a => a.tipo === 'equipo_medico') 
        : [],
      fecha_generacion: new Date().toISOString()
    };
    
    res.status(200).json({
      exito: true,
      resumen: resumenSalud,
      mensaje: 'Resumen de salud obtenido correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /resumen-salud:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE EXPORTACIÓN ====================

/**
 * 17. Exportar información a PDF
 * POST /api/info-adulto/exportar-pdf
 */
router.post('/exportar-pdf', async (req, res) => {
  try {
    const { usuario_id, adulto_id, tipo_exportacion } = req.body;
    
    if (!usuario_id || !adulto_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    // Obtener información completa
    const resultado = await infoAdultoControlador.generarReporteSalud(
      adulto_id, 
      usuario_id, 
      tipo_exportacion || 'completo'
    );
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_ACCESO' ? 403 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    // En un sistema real, aquí generas el PDF
    // Por ahora, devolvemos los datos para que el frontend los maneje
    res.status(200).json({
      exito: true,
      datos: resultado.reporte,
      formato: 'pdf',
      nombre_archivo: `informacion_salud_${Date.now()}.pdf`,
      mensaje: 'Datos listos para exportar a PDF'
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
 * 18. Sincronizar información
 * POST /api/info-adulto/sincronizar
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
    
    // Esta ruta sería útil para sincronización offline
    // Por ahora, solo verificamos permisos y devolvemos un mensaje
    
    const resultado = await infoAdultoControlador.obtenerAdultoMayorPrincipal(usuario_id);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    res.status(200).json({
      exito: true,
      mensaje: 'Sincronización completada',
      timestamp: new Date().toISOString(),
      cambios_procesados: datos_sincronizacion?.cambios?.length || 0
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