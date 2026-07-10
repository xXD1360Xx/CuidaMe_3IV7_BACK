/**
 * rutas/familiaRutas.js - Rutas para Gestión de Grupos Familiares
 */
import express from 'express';
import * as familiaControlador from '../controladores/familiaControlador.js';
import { autenticarUsuario, verificarRol, verificarGrupo } from '../middleware/autenticacionMiddleware.js';

const router = express.Router();

// ==================== RUTAS DE GRUPOS FAMILIARES ====================

/**
 * 1. Obtener información del grupo familiar del usuario
 * POST /api/familia/grupo-familiar
 */
router.post('/grupo-familiar', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.obtenerGrupoFamiliar(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_GRUPO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /grupo-familiar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 2. Obtener código familiar del grupo
 * POST /api/familia/codigo-familiar
 */
router.post('/codigo-familiar', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.obtenerCodigoFamiliar(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_GRUPO' ? 404 :
        resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /codigo-familiar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 3. Regenerar código familiar (solo administradores)
 * POST /api/familia/regenerar-codigo
 */
router.post('/regenerar-codigo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.regenerarCodigoFamiliar(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'ERROR_GENERACION_CODIGO' ? 500 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /regenerar-codigo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE MIEMBROS DE LA FAMILIA ====================

/**
 * 4. Obtener todos los familiares del grupo
 * POST /api/familia/familiares
 */
router.post('/familiares', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.obtenerFamiliares(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_GRUPO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }

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

/**
 * 5. Agregar familiar al grupo (solo administradores)
 * POST /api/familia/agregar-familiar
 */
router.post('/agregar-familiar', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, datos_familiar } = req.body;

    if (!usuario_id || !datos_familiar) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del familiar son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.crearFamiliar(usuario_id, datos_familiar);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'GRUPO_LLENO' ? 400 :
          resultado.codigo === 'NOMBRE_REQUERIDO' ? 400 :
            resultado.codigo === 'USUARIO_EN_GRUPO' ? 409 :
              resultado.codigo === 'USUARIO_DUPLICADO' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(201).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /agregar-familiar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 6. Actualizar información de un familiar
 * PUT /api/familia/actualizar-familiar/:familiar_id
 */
router.put('/actualizar-familiar/:familiar_id', autenticarUsuario, async (req, res) => {
  try {
    const { familiar_id } = req.params;
    const { usuario_id, datos_familiar } = req.body;

    if (!familiar_id || !usuario_id || !datos_familiar) {
      return res.status(400).json({
        exito: false,
        error: 'ID de familiar, usuario y datos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.actualizarFamiliar(usuario_id, familiar_id, datos_familiar);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'FAMILIAR_NO_ENCONTRADO' ? 404 :
          resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /actualizar-familiar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 7. Eliminar familiar del grupo (solo administradores)
 * DELETE /api/familia/eliminar-familiar/:familiar_id
 */
router.delete('/eliminar-familiar/:familiar_id', autenticarUsuario, async (req, res) => {
  try {
    const { familiar_id } = req.params;
    const { usuario_id } = req.body;

    if (!familiar_id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de familiar y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.eliminarFamiliar(usuario_id, familiar_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'FAMILIAR_NO_ENCONTRADO' ? 404 :
          resultado.codigo === 'UNICO_ADMIN' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /eliminar-familiar:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE CÓDIGOS PERSONALIZADOS ====================

/**
 * 8. Obtener códigos personalizados del grupo (solo administradores)
 * POST /api/familia/codigos-personalizados
 */
router.post('/codigos-personalizados', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.obtenerCodigosPersonalizados(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /codigos-personalizados:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 9. Crear código personalizado (solo administradores)
 * POST /api/familia/crear-codigo-personalizado
 */
router.post('/crear-codigo-personalizado', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, datos_codigo } = req.body;

    if (!usuario_id || !datos_codigo) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del código son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.crearCodigoPersonalizado(usuario_id, datos_codigo);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'NOMBRE_REQUERIDO' ? 400 :
          resultado.codigo === 'ERROR_GENERACION_CODIGO' ? 500 :
            resultado.codigo === 'CODIGO_DUPLICADO' ? 409 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(201).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /crear-codigo-personalizado:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 10. Eliminar código personalizado (solo administradores)
 * DELETE /api/familia/eliminar-codigo-personalizado/:codigo_id
 */
router.delete('/eliminar-codigo-personalizado/:codigo_id', autenticarUsuario, async (req, res) => {
  try {
    const { codigo_id } = req.params;
    const { usuario_id } = req.body;

    if (!codigo_id || !usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de código y usuario son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.eliminarCodigoPersonalizado(usuario_id, codigo_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'CODIGO_NO_ENCONTRADO' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /eliminar-codigo-personalizado:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE ADULTO MAYOR ====================

/**
 * 11. Crear/Actualizar información del adulto mayor del grupo
 * POST /api/familia/actualizar-adulto-mayor
 */
router.post('/actualizar-adulto-mayor', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, datos_adulto_mayor } = req.body;

    if (!usuario_id || !datos_adulto_mayor) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y datos del adulto mayor son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.actualizarAdultoMayor(usuario_id, datos_adulto_mayor);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_PERMISOS' ? 403 :
        resultado.codigo === 'DATOS_INCOMPLETOS' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /actualizar-adulto-mayor:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 12. Obtener información del adulto mayor del grupo
 * POST /api/familia/adulto-mayor
 */
router.post('/adulto-mayor', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.obtenerAdultoMayor(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_GRUPO' ? 404 :
        resultado.codigo === 'NO_ADULTO_MAYOR' ? 404 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /adulto-mayor:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== RUTAS DE UTILIDADES Y REPORTES ====================

/**
 * 13. Obtener resumen del grupo familiar
 * POST /api/familia/resumen-grupo
 */
router.post('/resumen-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const grupoResult = await familiaControlador.obtenerGrupoFamiliar(usuario_id);

    if (!grupoResult.exito) {
      const statusCode = grupoResult.codigo === 'SIN_GRUPO' ? 404 : 500;
      return res.status(statusCode).json(grupoResult);
    }

    const { grupo } = grupoResult;

    const totalMiembros = grupo.miembros?.length || 0;
    const totalAdministradores = grupo.miembros?.filter(m => m.rol_en_grupo === 'admin').length || 0;
    const totalResponsables = grupo.miembros?.filter(m => m.rol_en_grupo === 'responsable').length || 0;

    const parentescos = {};
    if (grupo.miembros) {
      grupo.miembros.forEach(miembro => {
        const parentesco = miembro.parentesco || 'No especificado';
        if (!parentescos[parentesco]) {
          parentescos[parentesco] = 0;
        }
        parentescos[parentesco]++;
      });
    }

    const generos = {};
    if (grupo.miembros) {
      grupo.miembros.forEach(miembro => {
        const genero = miembro.genero || 'No especificado';
        if (!generos[genero]) {
          generos[genero] = 0;
        }
        generos[genero]++;
      });
    }

    let actividadReciente = [];
    try {
      actividadReciente = [
        {
          tipo: 'miembro_unido',
          descripcion: 'Nuevo familiar se unió al grupo',
          fecha: new Date().toISOString(),
          usuario_nombre: grupo.miembros?.[0]?.nombre || 'Nuevo Miembro'
        }
      ];
    } catch (error) {
      console.log('⚠️ No se pudieron obtener actividades recientes');
    }

    const resumen = {
      estadisticas: {
        total_miembros: totalMiembros,
        total_administradores: totalAdministradores,
        total_responsables: totalResponsables,
        parentescos,
        generos,
        tiene_adulto_mayor: !!grupo.adulto_mayor,
        fecha_creacion: grupo.fecha_creacion
      },
      actividad_reciente: actividadReciente,
      capacidad_grupo: {
        actual: totalMiembros,
        maximo: grupo.max_integrantes,
        porcentaje_ocupado: grupo.max_integrantes > 0
          ? Math.round((totalMiembros / grupo.max_integrantes) * 100)
          : 0
      }
    };

    res.status(200).json({
      exito: true,
      resumen,
      grupo_info: {
        nombre: grupo.nombre_grupo,
        codigo_familiar: grupo.codigo_familiar,
        fecha_expiracion: grupo.fecha_expiracion
      }
    });

  } catch (error) {
    console.error('❌ Error en ruta /resumen-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 14. Verificar permisos del usuario en el grupo
 * POST /api/familia/verificar-permisos
 */
router.post('/verificar-permisos', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, permisos_requeridos } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const grupoResult = await familiaControlador.obtenerGrupoFamiliar(usuario_id);

    if (!grupoResult.exito) {
      return res.status(404).json(grupoResult);
    }

    const { grupo } = grupoResult;
    const usuarioEnGrupo = grupo.miembros?.find(m => m.id === usuario_id);

    if (!usuarioEnGrupo) {
      return res.status(403).json({
        exito: false,
        error: 'Usuario no encontrado en el grupo',
        codigo: 'USUARIO_NO_ENCONTRADO'
      });
    }

    let tienePermisos = true;
    const permisosVerificados = {};

    if (permisos_requeridos && Array.isArray(permisos_requeridos)) {
      permisos_requeridos.forEach(permiso => {
        let tienePermiso = false;
        switch (permiso) {
          case 'administrar_grupo':
            tienePermiso = usuarioEnGrupo.rol_en_grupo === 'admin';
            break;
          case 'gestionar_familiares':
            tienePermiso = usuarioEnGrupo.rol_en_grupo === 'admin' || usuarioEnGrupo.rol_en_grupo === 'responsable';
            break;
          case 'ver_todo':
            tienePermiso = true;
            break;
          case 'editar_adulto_mayor':
            tienePermiso = usuarioEnGrupo.rol_en_grupo === 'admin' || usuarioEnGrupo.rol_en_grupo === 'responsable';
            break;
          case 'gestionar_codigos':
            tienePermiso = usuarioEnGrupo.rol_en_grupo === 'admin';
            break;
          default:
            tienePermiso = false;
        }
        permisosVerificados[permiso] = tienePermiso;
        if (!tienePermiso) tienePermisos = false;
      });
    }

    res.status(200).json({
      exito: true,
      permisos: permisosVerificados,
      tiene_permisos: tienePermisos,
      usuario: {
        id: usuarioEnGrupo.id,
        nombre: usuarioEnGrupo.nombre,
        rol_en_grupo: usuarioEnGrupo.rol_en_grupo,
        parentesco: usuarioEnGrupo.parentesco
      },
      grupo: {
        id: grupo.id,
        nombre: grupo.nombre_grupo
      }
    });

  } catch (error) {
    console.error('❌ Error en ruta /verificar-permisos:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 15. Exportar información del grupo familiar
 * POST /api/familia/exportar-grupo
 */
router.post('/exportar-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, formato } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const grupoResult = await familiaControlador.obtenerGrupoFamiliar(usuario_id);

    if (!grupoResult.exito) {
      return res.status(404).json(grupoResult);
    }

    const { grupo } = grupoResult;
    const adultoMayorResult = await familiaControlador.obtenerAdultoMayor(usuario_id);
    const adultoMayor = adultoMayorResult.exito ? adultoMayorResult.adulto_mayor : null;

    const datosExportacion = {
      grupo: {
        nombre: grupo.nombre_grupo,
        descripcion: grupo.descripcion,
        codigo_familiar: grupo.codigo_familiar,
        fecha_creacion: grupo.fecha_creacion,
        fecha_expiracion: grupo.fecha_expiracion,
        administrador_principal: {
          id: grupo.admin_id,
          nombre: grupo.admin_nombre,
          email: grupo.admin_email
        }
      },
      miembros: grupo.miembros?.map(miembro => ({
        id: miembro.id,
        nombre_completo: `${miembro.nombre} ${miembro.apellido || ''}`.trim(),
        email: miembro.email,
        telefono: miembro.telefono,
        rol_en_grupo: miembro.rol_en_grupo,
        parentesco: miembro.parentesco,
        fecha_unio: miembro.fecha_unio,
        invitado_por: miembro.invitado_por_nombre
      })) || [],
      adulto_mayor: adultoMayor ? {
        nombre: adultoMayor.nombre,
        fecha_nacimiento: adultoMayor.fecha_nacimiento,
        genero: adultoMayor.genero,
        estado_salud: adultoMayor.estado_salud,
        medico_principal: adultoMayor.medico_principal,
        telefono_emergencia: adultoMayor.telefono_emergencia,
        alergias: adultoMayor.alergias,
        medicamentos_cronicos: adultoMayor.medicamentos_cronicos
      } : null,
      estadisticas: {
        total_miembros: grupo.miembros?.length || 0,
        tiene_adulto_mayor: !!adultoMayor,
        fecha_generacion: new Date().toISOString()
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    res.status(200).json({
      exito: true,
      datos: datosExportacion,
      formato: formato || 'json',
      nombre_archivo: `grupo_familiar_${timestamp}.${formato || 'json'}`,
      mensaje: 'Datos del grupo listos para exportación'
    });

  } catch (error) {
    console.error('❌ Error en ruta /exportar-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 16. Sincronizar datos del grupo familiar
 * POST /api/familia/sincronizar
 */
router.post('/sincronizar', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, datos_sincronizacion } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    console.log('🔄 Sincronizando grupo familiar para usuario:', usuario_id);

    res.status(200).json({
      exito: true,
      sincronizado_en: new Date().toISOString(),
      cambios_aplicados: 0,
      mensaje: 'Sincronización del grupo familiar completada (modo de demostración)'
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

// ==================== NUEVAS RUTAS: CREAR Y UNIRSE A GRUPO ====================

/**
 * 17. Crear nuevo grupo familiar (usuario se convierte en admin)
 * POST /api/familia/crear-grupo
 */
router.post('/crear-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, nombre_grupo } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.crearGrupoFamiliar(usuario_id, nombre_grupo || 'Mi Familia');

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'ERROR_GENERACION_CODIGO' ? 500 : 400;
      return res.status(statusCode).json(resultado);
    }

    res.status(201).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /crear-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 18. Unirse a grupo familiar existente
 * POST /api/familia/unirse-grupo
 */
router.post('/unirse-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id, codigo_familiar } = req.body;

    if (!usuario_id || !codigo_familiar) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y código familiar son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }

    const resultado = await familiaControlador.unirseAGrupoFamiliar(usuario_id, codigo_familiar);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'CODIGO_INVALIDO' ? 404 :
        resultado.codigo === 'YA_EN_GRUPO' ? 409 : 400;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /unirse-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

/**
 * 19. Ruta de prueba
 * GET /api/familia/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    exito: true,
    mensaje: 'API de Gestión Familiar funcionando correctamente',
    version: '1.0.0',
    fecha: new Date().toISOString()
  });
});


/**
 * 20. Eliminar grupo familiar (solo administradores) - elimina todos los datos asociados
 * DELETE /api/familia/eliminar-grupo
 */
router.delete('/eliminar-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.eliminarGrupoFamiliar(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'NO_ADMIN_O_GRUPO_INACTIVO' ? 403 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /eliminar-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});



/**
 * 21. Salir del grupo familiar (para cualquier miembro)
 * POST /api/familia/salir-grupo
 */
router.post('/salir-grupo', autenticarUsuario, async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }

    const resultado = await familiaControlador.salirDelGrupoFamiliar(usuario_id);

    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'SIN_GRUPO' ? 404 :
        resultado.codigo === 'ERROR_SALIDA' ? 400 : 500;
      return res.status(statusCode).json(resultado);
    }

    res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Error en ruta /salir-grupo:', error.message);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_INTERNO'
    });
  }
});

// ==================== EXPORTACIÓN ====================

export default router;