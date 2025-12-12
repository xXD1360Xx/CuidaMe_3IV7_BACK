/**
 * rutas/preferenciasRutas.js - Rutas para Preferencias y Configuración de Usuario
 */
import express from 'express';
import * as preferenciasControlador from '../controladores/preferenciasControlador.js';

const router = express.Router();

// ==================== RUTAS DE INFORMACIÓN DEL USUARIO ====================

/**
 * 1. Obtener información del usuario
 * POST /api/preferencias/informacion-usuario
 */
router.post('/informacion-usuario', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.obtenerInformacionUsuario(usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'USUARIO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /informacion-usuario:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 2. Actualizar información del usuario
 * PUT /api/preferencias/actualizar-usuario
 */
router.put('/actualizar-usuario', async (req, res) => {
  try {
    const { usuario_id, datos } = req.body;
    
    if (!usuario_id || !datos) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.actualizarUsuario(usuario_id, datos);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'USUARIO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'SIN_CAMPOS' ? 400 :
                       resultado.codigo === 'EMAIL_DUPLICADO' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-usuario:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 3. Cambiar contraseña
 * POST /api/preferencias/cambiar-contrasena
 */
router.post('/cambiar-contrasena', async (req, res) => {
  try {
    const { usuario_id, contrasena_actual, nueva_contrasena } = req.body;
    
    if (!usuario_id || !contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario, contraseña actual y nueva contraseña son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.cambiarContrasena(usuario_id, {
      contrasena_actual,
      nueva_contrasena
    });
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'USUARIO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'CONTRASENA_CORTA' ? 400 :
                       resultado.codigo === 'CONTRASENA_ACTUAL_INCORRECTA' ? 401 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /cambiar-contrasena:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE TELÉFONOS ====================

/**
 * 4. Obtener teléfonos del usuario
 * POST /api/preferencias/telefonos
 */
router.post('/telefonos', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.obtenerTelefonosUsuario(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /telefonos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 5. Agregar teléfono
 * POST /api/preferencias/telefonos/agregar
 */
router.post('/telefonos/agregar', async (req, res) => {
  try {
    const { usuario_id, numero, tipo, principal } = req.body;
    
    if (!usuario_id || !numero) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y número de teléfono son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.agregarTelefono(usuario_id, {
      numero,
      tipo,
      principal
    });
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'TELEFONO_INVALIDO' ? 400 :
                       resultado.codigo === 'TELEFONO_DUPLICADO' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /telefonos/agregar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Eliminar teléfono
 * DELETE /api/preferencias/telefonos/eliminar/:telefono_id
 */
router.delete('/telefonos/eliminar/:telefono_id', async (req, res) => {
  try {
    const { telefono_id } = req.params;
    const { usuario_id } = req.body;
    
    if (!telefono_id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de teléfono y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.eliminarTelefono(telefono_id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'TELEFONO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'UNICO_TELEFONO' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /telefonos/eliminar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 7. Marcar teléfono como principal
 * POST /api/preferencias/telefonos/marcar-principal/:telefono_id
 */
router.post('/telefonos/marcar-principal/:telefono_id', async (req, res) => {
  try {
    const { telefono_id } = req.params;
    const { usuario_id } = req.body;
    
    if (!telefono_id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de teléfono y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.marcarTelefonoPrincipal(telefono_id, usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'TELEFONO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /telefonos/marcar-principal:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE PREFERENCIAS ====================

/**
 * 8. Obtener preferencias del usuario
 * POST /api/preferencias/preferencias
 */
router.post('/preferencias', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.obtenerPreferenciasUsuario(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /preferencias:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 9. Actualizar preferencias
 * PUT /api/preferencias/actualizar-preferencias
 */
router.put('/actualizar-preferencias', async (req, res) => {
  try {
    const { usuario_id, preferencias } = req.body;
    
    if (!usuario_id || !preferencias) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y preferencias son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.actualizarPreferencias(usuario_id, preferencias);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-preferencias:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ADMINISTRACIÓN ====================

/**
 * 10. Verificar otros administradores
 * POST /api/preferencias/verificar-administradores
 */
router.post('/verificar-administradores', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.verificarOtrosAdministradores(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /verificar-administradores:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 11. Renunciar a rol de administrador
 * POST /api/preferencias/renunciar-administrador
 */
router.post('/renunciar-administrador', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.renunciarAdministrador(usuario_id);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'UNICO_ADMINISTRADOR' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /renunciar-administrador:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE SEGURIDAD ====================

/**
 * 12. Obtener sesiones activas
 * POST /api/preferencias/sesiones-activas
 */
router.post('/sesiones-activas', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.obtenerSesionesActivas(usuario_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /sesiones-activas:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 13. Cerrar otras sesiones
 * POST /api/preferencias/cerrar-sesiones
 */
router.post('/cerrar-sesiones', async (req, res) => {
  try {
    const { usuario_id, sesion_actual_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.cerrarOtrasSesiones(usuario_id, sesion_actual_id);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /cerrar-sesiones:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 14. Solicitar eliminación de cuenta
 * POST /api/preferencias/solicitar-eliminacion-cuenta
 */
router.post('/solicitar-eliminacion-cuenta', async (req, res) => {
  try {
    const { usuario_id, razon } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.solicitarEliminacionCuenta(usuario_id, razon);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'USUARIO_NO_ENCONTRADO' ? 404 :
                       resultado.codigo === 'UNICO_ADMINISTRADOR_ELIMINAR' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /solicitar-eliminacion-cuenta:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE PERFIL ====================

/**
 * 15. Actualizar foto de perfil
 * POST /api/preferencias/actualizar-foto-perfil
 */
router.post('/actualizar-foto-perfil', async (req, res) => {
  try {
    const { usuario_id, foto_base64, tipo } = req.body;
    
    if (!usuario_id || !foto_base64) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y foto son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await preferenciasControlador.actualizarFotoPerfil(usuario_id, {
      foto_base64,
      tipo
    });
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 :
                       resultado.codigo === 'IMAGEN_DEMASIADO_GRANDE' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actualizar-foto-perfil:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 16. Obtener actividad reciente
 * POST /api/preferencias/actividad-reciente
 */
router.post('/actividad-reciente', async (req, res) => {
  try {
    const { usuario_id, limite } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await preferenciasControlador.obtenerActividadReciente(usuario_id, limite || 10);
    
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en ruta /actividad-reciente:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS ADICIONALES ====================

/**
 * 17. Exportar datos del usuario
 * POST /api/preferencias/exportar-datos
 */
router.post('/exportar-datos', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    // Obtener múltiples datos del usuario
    const [
      informacionResult,
      preferenciasResult,
      telefonosResult,
      sesionesResult,
      actividadResult
    ] = await Promise.all([
      preferenciasControlador.obtenerInformacionUsuario(usuario_id),
      preferenciasControlador.obtenerPreferenciasUsuario(usuario_id),
      preferenciasControlador.obtenerTelefonosUsuario(usuario_id),
      preferenciasControlador.obtenerSesionesActivas(usuario_id),
      preferenciasControlador.obtenerActividadReciente(usuario_id, 50)
    ]);
    
    const datosExportacion = {
      usuario: informacionResult.exito ? informacionResult.usuario : null,
      preferencias: preferenciasResult.exito ? preferenciasResult.preferencias : {},
      telefonos: telefonosResult.exito ? telefonosResult.telefonos : [],
      sesiones_activas: sesionesResult.exito ? sesionesResult.sesiones : [],
      actividad_reciente: actividadResult.exito ? actividadResult.actividades : [],
      fecha_exportacion: new Date().toISOString(),
      formato: 'json'
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    res.status(200).json({
      exito: true,
      datos: datosExportacion,
      nombre_archivo: `datos_usuario_${timestamp}.json`,
      mensaje: 'Datos listos para exportación'
    });
    
  } catch (error) {
    console.error('❌ Error en ruta /exportar-datos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 18. Obtener resumen de preferencias
 * POST /api/preferencias/resumen
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
    
    // Obtener datos principales
    const [
      informacionResult,
      preferenciasResult,
      telefonosResult
    ] = await Promise.all([
      preferenciasControlador.obtenerInformacionUsuario(usuario_id),
      preferenciasControlador.obtenerPreferenciasUsuario(usuario_id),
      preferenciasControlador.obtenerTelefonosUsuario(usuario_id)
    ]);
    
    const resumen = {
      usuario: informacionResult.exito ? {
        nombre: informacionResult.usuario.nombre,
        email: informacionResult.usuario.email,
        fecha_registro: informacionResult.usuario.creado_en,
        rol: informacionResult.usuario.rol
      } : null,
      preferencias: preferenciasResult.exito ? preferenciasResult.preferencias : {},
      telefonos_principales: telefonosResult.exito 
        ? telefonosResult.telefonos.filter(t => t.principal).map(t => ({
            numero: t.numero,
            tipo: t.tipo
          }))
        : [],
      total_telefonos: telefonosResult.exito ? telefonosResult.total : 0,
      fecha_consulta: new Date().toISOString()
    };
    
    res.status(200).json({
      exito: true,
      resumen,
      mensaje: 'Resumen de preferencias obtenido'
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
 * 19. Sincronizar preferencias
 * POST /api/preferencias/sincronizar
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
    
    console.log('🔄 Sincronizando preferencias para usuario:', usuario_id);
    
    res.status(200).json({
      exito: true,
      sincronizado_en: new Date().toISOString(),
      cambios_aplicados: 0,
      mensaje: 'Preferencias sincronizadas (modo de demostración)'
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
 * GET /api/preferencias/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    exito: true,
    mensaje: 'API de Preferencias funcionando correctamente',
    version: '1.0.0',
    fecha: new Date().toISOString()
  });
});

// ==================== EXPORTACIÓN ====================

export default router;