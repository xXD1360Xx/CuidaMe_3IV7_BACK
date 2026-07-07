// controladores/horarioControlador.js - Controlador de Horario Unificado
import { pool } from '../configuracion/basedeDatos.js';

// ==================== FUNCIONES DE CONFIGURACIÓN ====================

/**
 * 1. Obtener configuración del horario
 */
export const obtenerConfiguracionHorario = async (usuarioId) => {
  let client;

  try {
    console.log('⚙️ [HORARIO] Obteniendo configuración para usuario ID:', usuarioId);

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Obtener configuración existente
    const configQuery = `
      SELECT * FROM configuracion_horario 
      WHERE adulto_mayor_id = $1
    `;

    const configResult = await client.query(configQuery, [adulto_mayor_id]);

    if (configResult.rows.length === 0) {
      // Crear configuración por defecto
      const configPorDefecto = {
        hora_inicio: 8,
        hora_fin: 22,
        hora_despertar: 7,
        hora_dormir: 22,
        mostrar_fines: true,
        mostrar_medicinas: true,
        mostrar_eventos: true,
        mostrar_actividades: true
      };

      console.log('ℹ️  Creando configuración por defecto');

      return {
        exito: true,
        configuracion: {
          ...configPorDefecto,
          adulto_mayor_id
        }
      };
    }

    const configuracion = configResult.rows[0];

    console.log('✅ Configuración obtenida:', configuracion.hora_inicio, '-', configuracion.hora_fin);

    return {
      exito: true,
      configuracion
    };

  } catch (error) {
    console.error('❌ Error en obtenerConfiguracionHorario:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener configuración',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Guardar configuración del horario
 */
export const guardarConfiguracionHorario = async (usuarioId, configuracion) => {
  let client;

  try {
    console.log('💾 [HORARIO] Guardando configuración por usuario ID:', usuarioId);

    // Validar datos requeridos
    const camposRequeridos = ['horaInicio', 'horaFin', 'horaDespertar', 'horaDormir'];
    for (const campo of camposRequeridos) {
      if (configuracion[campo] === undefined || configuracion[campo] === null) {
        return {
          exito: false,
          error: `El campo ${campo} es requerido`,
          codigo: 'DATOS_INCOMPLETOS'
        };
      }
    }

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Verificar si ya existe configuración
    const checkQuery = `
      SELECT id FROM configuracion_horario 
      WHERE adulto_mayor_id = $1
    `;

    const checkResult = await client.query(checkQuery, [adulto_mayor_id]);

    let resultado;

    if (checkResult.rows.length > 0) {
      // Actualizar configuración existente
      const updateQuery = `
        UPDATE configuracion_horario 
        SET hora_inicio = $1, 
            hora_fin = $2, 
            hora_despertar = $3, 
            hora_dormir = $4, 
            mostrar_fines = $5, 
            mostrar_medicinas = $6, 
            mostrar_eventos = $7, 
            mostrar_actividades = $8,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE adulto_mayor_id = $9
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        configuracion.horaInicio,
        configuracion.horaFin,
        configuracion.horaDespertar,
        configuracion.horaDormir,
        configuracion.mostrarFines !== undefined ? configuracion.mostrarFines : true,
        configuracion.mostrarMedicinas !== undefined ? configuracion.mostrarMedicinas : true,
        configuracion.mostrarEventos !== undefined ? configuracion.mostrarEventos : true,
        configuracion.mostrarActividades !== undefined ? configuracion.mostrarActividades : true,
        adulto_mayor_id
      ]);

      resultado = updateResult.rows[0];
    } else {
      // Insertar nueva configuración
      const insertQuery = `
        INSERT INTO configuracion_horario (
          adulto_mayor_id, 
          hora_inicio, 
          hora_fin, 
          hora_despertar, 
          hora_dormir, 
          mostrar_fines, 
          mostrar_medicinas, 
          mostrar_eventos, 
          mostrar_actividades
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        adulto_mayor_id,
        configuracion.horaInicio,
        configuracion.horaFin,
        configuracion.horaDespertar,
        configuracion.horaDormir,
        configuracion.mostrarFines !== undefined ? configuracion.mostrarFines : true,
        configuracion.mostrarMedicinas !== undefined ? configuracion.mostrarMedicinas : true,
        configuracion.mostrarEventos !== undefined ? configuracion.mostrarEventos : true,
        configuracion.mostrarActividades !== undefined ? configuracion.mostrarActividades : true
      ]);

      resultado = insertResult.rows[0];
    }

    console.log('✅ Configuración guardada exitosamente');

    return {
      exito: true,
      configuracion: resultado,
      mensaje: 'Configuración guardada correctamente'
    };

  } catch (error) {
    console.error('❌ Error en guardarConfiguracionHorario:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al guardar configuración',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE ACTIVIDADES FIJAS ====================

/**
 * 3. Obtener actividades fijas
 */
export const obtenerActividadesFijas = async (usuarioId) => {
  let client;

  try {
    console.log('📋 [HORARIO] Obteniendo actividades fijas para usuario ID:', usuarioId);

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        actividades: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Obtener actividades activas y recurrentes
    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        color,
        dias,
        hora_inicio,
        hora_fin,
        duracion_minutos,
        descripcion,
        recordatorio,
        es_recurrente as "esRecurrente",
        fecha_inicio,
        fecha_fin,
        creado_en,
        creado_por
      FROM actividades_horario 
      WHERE adulto_mayor_id = $1 
        AND activa = true
        AND (es_recurrente = true OR fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
      ORDER BY 
        CASE 
          WHEN tipo = 'medicina' THEN 1
          WHEN tipo = 'cita_medica' THEN 2
          WHEN tipo = 'actividad_diaria' THEN 3
          ELSE 4
        END,
        hora_inicio
    `;

    const result = await client.query(query, [adulto_mayor_id]);

    const actividades = result.rows.map(actividad => ({
      ...actividad,
      dias: actividad.dias || []
    }));

    console.log(`✅ Encontradas ${actividades.length} actividades fijas`);

    return {
      exito: true,
      actividades,
      adulto_mayor_id,
      total: actividades.length
    };

  } catch (error) {
    console.error('❌ Error en obtenerActividadesFijas:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades fijas',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 4. Crear actividad
 */
export const crearActividad = async (usuarioId, actividad) => {
  let client;

  try {
    console.log('➕ [HORARIO] Creando actividad para usuario ID:', usuarioId);

    // Validar datos requeridos
    const camposRequeridos = ['nombre', 'hora_inicio', 'hora_fin', 'dias'];
    for (const campo of camposRequeridos) {
      if (!actividad[campo]) {
        return {
          exito: false,
          error: `El campo ${campo} es requerido`,
          codigo: 'DATOS_INCOMPLETOS'
        };
      }
    }

    // Validar formato de días
    if (!Array.isArray(actividad.dias) || actividad.dias.length === 0) {
      return {
        exito: false,
        error: 'Los días deben ser un array con al menos un día',
        codigo: 'DIAS_INVALIDOS'
      };
    }

    // Validar días (0-6)
    for (const dia of actividad.dias) {
      if (dia < 0 || dia > 6) {
        return {
          exito: false,
          error: 'Los días deben ser números entre 0 (domingo) y 6 (sábado)',
          codigo: 'DIAS_RANGO_INVALIDO'
        };
      }
    }

    // Validar formato de hora
    const horaRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!horaRegex.test(actividad.hora_inicio) || !horaRegex.test(actividad.hora_fin)) {
      return {
        exito: false,
        error: 'Formato de hora inválido. Use HH:MM',
        codigo: 'HORA_FORMATO_INVALIDO'
      };
    }

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Verificar conflicto de horario
    const conflictQuery = `
      SELECT nombre, hora_inicio, hora_fin, dias
      FROM actividades_horario
      WHERE adulto_mayor_id = $1
        AND activa = true
        AND dias && $2::jsonb
        AND (
          (hora_inicio <= $3 AND hora_fin > $3) OR
          (hora_inicio < $4 AND hora_fin >= $4) OR
          (hora_inicio >= $3 AND hora_fin <= $4)
        )
    `;

    const conflictResult = await client.query(conflictQuery, [
      adulto_mayor_id,
      JSON.stringify(actividad.dias),
      actividad.hora_inicio,
      actividad.hora_fin
    ]);

    if (conflictResult.rows.length > 0) {
      const conflicto = conflictResult.rows[0];
      return {
        exito: false,
        error: `Conflicto de horario con "${conflicto.nombre}" (${conflicto.hora_inicio} - ${conflicto.hora_fin})`,
        codigo: 'CONFLICTO_HORARIO'
      };
    }

    // Insertar nueva actividad
    const query = `
      INSERT INTO actividades_horario (
        usuario_id,
        adulto_mayor_id,
        nombre,
        tipo,
        color,
        dias,
        hora_inicio,
        hora_fin,
        duracion_minutos,
        descripcion,
        recordatorio,
        es_recurrente,
        fecha_inicio,
        fecha_fin,
        creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      usuarioId,
      adulto_mayor_id,
      actividad.nombre.trim(),
      actividad.tipo || 'actividad_diaria',
      actividad.color || '#4A90E2',
      JSON.stringify(actividad.dias),
      actividad.hora_inicio,
      actividad.hora_fin,
      actividad.duracion_minutos || 60,
      actividad.descripcion || '',
      actividad.recordatorio !== undefined ? actividad.recordatorio : true,
      actividad.esRecurrente !== undefined ? actividad.esRecurrente : true,
      actividad.fecha_inicio || new Date().toISOString().split('T')[0],
      actividad.fecha_fin || null,
      usuarioId
    ];

    const result = await client.query(query, values);

    const nuevaActividad = result.rows[0];
    nuevaActividad.dias = nuevaActividad.dias || [];

    console.log('✅ Actividad creada exitosamente:', nuevaActividad.nombre);

    return {
      exito: true,
      actividad: nuevaActividad,
      mensaje: 'Actividad creada correctamente'
    };

  } catch (error) {
    console.error('❌ Error en crearActividad:', error.message);

    if (error.code === '23505') {
      return {
        exito: false,
        error: 'La actividad ya existe',
        codigo: 'ACTIVIDAD_DUPLICADA'
      };
    }

    return {
      exito: false,
      error: 'Error del servidor al crear actividad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Actualizar actividad
 */
export const actualizarActividad = async (actividadId, usuarioId, actividad) => {
  let client;

  try {
    console.log('✏️ [HORARIO] Actualizando actividad ID:', actividadId);

    client = await pool.connect();

    // Verificar que la actividad existe y pertenece al usuario
    const verifyQuery = `
      SELECT ah.id, ah.usuario_id, ah.activa
      FROM actividades_horario ah
      WHERE ah.id = $1
    `;

    const verifyResult = await client.query(verifyQuery, [actividadId]);

    if (verifyResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Actividad no encontrada',
        codigo: 'ACTIVIDAD_NO_ENCONTRADA'
      };
    }

    if (verifyResult.rows[0].usuario_id !== usuarioId) {
      return {
        exito: false,
        error: 'No tienes permiso para modificar esta actividad',
        codigo: 'SIN_PERMISOS'
      };
    }

    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const camposPermitidos = [
      'nombre', 'tipo', 'color', 'dias', 'hora_inicio', 'hora_fin',
      'duracion_minutos', 'descripcion', 'recordatorio', 'es_recurrente',
      'fecha_inicio', 'fecha_fin', 'activa'
    ];

    for (const campo of camposPermitidos) {
      if (actividad[campo] !== undefined) {
        if (campo === 'dias' && Array.isArray(actividad[campo])) {
          updates.push(`${campo} = $${paramIndex}`);
          values.push(JSON.stringify(actividad[campo]));
        } else {
          updates.push(`${campo} = $${paramIndex}`);
          values.push(actividad[campo]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return {
        exito: false,
        error: 'No se proporcionaron datos para actualizar',
        codigo: 'SIN_CAMPOS'
      };
    }

    values.push(actividadId);

    const query = `
      UPDATE actividades_horario 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(query, values);

    const actividadActualizada = result.rows[0];
    actividadActualizada.dias = actividadActualizada.dias || [];

    console.log('✅ Actividad actualizada exitosamente');

    return {
      exito: true,
      actividad: actividadActualizada,
      mensaje: 'Actividad actualizada correctamente'
    };

  } catch (error) {
    console.error('❌ Error en actualizarActividad:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al actualizar actividad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Eliminar actividad
 */
export const eliminarActividad = async (actividadId, usuarioId) => {
  let client;

  try {
    console.log('🗑️ [HORARIO] Eliminando actividad ID:', actividadId);

    client = await pool.connect();

    // Verificar que la actividad existe y pertenece al usuario
    const verifyQuery = `
      SELECT ah.id, ah.usuario_id
      FROM actividades_horario ah
      WHERE ah.id = $1
    `;

    const verifyResult = await client.query(verifyQuery, [actividadId]);

    if (verifyResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Actividad no encontrada',
        codigo: 'ACTIVIDAD_NO_ENCONTRADA'
      };
    }

    if (verifyResult.rows[0].usuario_id !== usuarioId) {
      return {
        exito: false,
        error: 'No tienes permiso para eliminar esta actividad',
        codigo: 'SIN_PERMISOS'
      };
    }

    // Eliminar actividad (borrado lógico)
    const deleteQuery = `
      UPDATE actividades_horario 
      SET activa = false, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await client.query(deleteQuery, [actividadId]);

    console.log('✅ Actividad eliminada exitosamente');

    return {
      exito: true,
      mensaje: 'Actividad eliminada correctamente',
      id: result.rows[0].id
    };

  } catch (error) {
    console.error('❌ Error en eliminarActividad:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al eliminar actividad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Obtener actividades por fecha específica
 */
export const obtenerActividadesPorFecha = async (usuarioId, fecha) => {
  let client;

  try {
    console.log('📅 [HORARIO] Obteniendo actividades para fecha:', fecha);

    // Validar formato de fecha
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
      return {
        exito: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD',
        codigo: 'FECHA_FORMATO_INVALIDO'
      };
    }

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        actividades: [],
        fecha,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    const fechaDate = new Date(fecha);
    const diaSemana = fechaDate.getDay();

    // Obtener actividades para esa fecha
    const query = `
      SELECT 
        ah.id,
        ah.nombre,
        ah.tipo,
        ah.color,
        ah.hora_inicio,
        ah.hora_fin,
        ah.duracion_minutos,
        ah.descripcion,
        ah.recordatorio,
        ah.creado_en,
        ar.completada,
        ar.observaciones
      FROM actividades_horario ah
      LEFT JOIN actividades_realizadas ar 
        ON ar.actividad_id = ah.id 
        AND ar.fecha = $1
        AND ar.adulto_mayor_id = $2
      WHERE ah.adulto_mayor_id = $2
        AND ah.activa = true
        AND (
          -- Actividades recurrentes que incluyen este día
          (ah.es_recurrente = true AND $3 = ANY(ah.dias::int[]))
          OR
          -- Actividades no recurrentes en este rango de fechas
          (ah.es_recurrente = false AND $1 >= ah.fecha_inicio AND 
           (ah.fecha_fin IS NULL OR $1 <= ah.fecha_fin) AND
           $3 = ANY(ah.dias::int[]))
        )
      ORDER BY ah.hora_inicio
    `;

    const result = await client.query(query, [
      fecha,
      adulto_mayor_id,
      diaSemana
    ]);

    console.log(`✅ Encontradas ${result.rows.length} actividades para ${fecha}`);

    return {
      exito: true,
      actividades: result.rows,
      fecha,
      diaSemana,
      adulto_mayor_id
    };

  } catch (error) {
    console.error('❌ Error en obtenerActividadesPorFecha:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 8. Registrar actividad realizada
 */
export const registrarActividadRealizada = async (usuarioId, datos) => {
  let client;

  try {
    console.log('✅ [HORARIO] Registrando actividad realizada');

    const { actividad_id, fecha, completada, observaciones } = datos;

    // Validar datos requeridos
    if (!actividad_id) {
      return {
        exito: false,
        error: 'El ID de la actividad es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }

    client = await pool.connect();

    // Verificar que la actividad existe
    const actividadQuery = `
      SELECT ah.id, ah.adulto_mayor_id, ah.hora_inicio, ah.hora_fin
      FROM actividades_horario ah
      WHERE ah.id = $1 AND ah.activa = true
    `;

    const actividadResult = await client.query(actividadQuery, [actividad_id]);

    if (actividadResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Actividad no encontrada',
        codigo: 'ACTIVIDAD_NO_ENCONTRADA'
      };
    }

    const actividad = actividadResult.rows[0];
    const adulto_mayor_id = actividad.adulto_mayor_id;

    // Verificar que el usuario es familiar del adulto mayor
    const familiarQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;

    const familiarResult = await client.query(familiarQuery, [usuarioId, adulto_mayor_id]);

    if (familiarResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes acceso a este adulto mayor',
        codigo: 'SIN_ACCESO'
      };
    }

    const fechaRegistro = fecha || new Date().toISOString().split('T')[0];

    // Verificar si ya existe registro
    const checkQuery = `
      SELECT id FROM actividades_realizadas 
      WHERE actividad_id = $1 AND fecha = $2 AND adulto_mayor_id = $3
    `;

    const checkResult = await client.query(checkQuery, [
      actividad_id,
      fechaRegistro,
      adulto_mayor_id
    ]);

    let resultado;

    if (checkResult.rows.length > 0) {
      // Actualizar registro existente
      const updateQuery = `
        UPDATE actividades_realizadas 
        SET completada = $1, 
            observaciones = $2,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        completada !== undefined ? completada : true,
        observaciones || null,
        checkResult.rows[0].id
      ]);

      resultado = updateResult.rows[0];
    } else {
      // Insertar nuevo registro
      const insertQuery = `
        INSERT INTO actividades_realizadas (
          actividad_id,
          usuario_id,
          adulto_mayor_id,
          fecha,
          hora_inicio,
          hora_fin,
          completada,
          observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        actividad_id,
        usuarioId,
        adulto_mayor_id,
        fechaRegistro,
        actividad.hora_inicio,
        actividad.hora_fin,
        completada !== undefined ? completada : true,
        observaciones || null
      ]);

      resultado = insertResult.rows[0];
    }

    console.log('✅ Actividad registrada exitosamente');

    return {
      exito: true,
      realizada: resultado,
      mensaje: completada ? 'Actividad marcada como completada' : 'Actividad actualizada'
    };

  } catch (error) {
    console.error('❌ Error en registrarActividadRealizada:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al registrar actividad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Obtener actividades por tipo
 */
export const obtenerActividadesPorTipo = async (usuarioId, tipo) => {
  let client;

  try {
    console.log('🏷️ [HORARIO] Obteniendo actividades por tipo:', tipo);

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        actividades: [],
        tipo,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        color,
        dias,
        hora_inicio,
        hora_fin,
        duracion_minutos,
        descripcion,
        recordatorio,
        es_recurrente as "esRecurrente"
      FROM actividades_horario 
      WHERE adulto_mayor_id = $1
        AND tipo = $2
        AND activa = true
      ORDER BY hora_inicio
    `;

    const result = await client.query(query, [adulto_mayor_id, tipo]);

    const actividades = result.rows.map(act => ({
      ...act,
      dias: act.dias || []
    }));

    console.log(`✅ Encontradas ${actividades.length} actividades tipo "${tipo}"`);

    return {
      exito: true,
      tipo,
      actividades,
      adulto_mayor_id,
      total: actividades.length
    };

  } catch (error) {
    console.error('❌ Error en obtenerActividadesPorTipo:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 10. Obtener actividades de hoy
 */
export const obtenerActividadesHoy = async (usuarioId) => {
  try {
    console.log('📝 [HORARIO] Obteniendo actividades para hoy');

    const hoy = new Date().toISOString().split('T')[0];
    return await obtenerActividadesPorFecha(usuarioId, hoy);

  } catch (error) {
    console.error('❌ Error en obtenerActividadesHoy:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  }
};

/**
 * 11. Obtener actividades de la semana
 */
export const obtenerActividadesSemana = async (usuarioId, fechaInicio = null) => {
  let client;

  try {
    console.log('📅 [HORARIO] Obteniendo actividades de la semana');

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        actividades_por_dia: {},
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Calcular inicio y fin de semana
    const hoy = new Date();
    const inicioSemana = fechaInicio ? new Date(fechaInicio) : new Date(hoy);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay()); // Domingo
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 6); // Sábado
    finSemana.setHours(23, 59, 59, 999);

    // Obtener actividades de toda la semana
    const query = `
      SELECT 
        ah.id,
        ah.nombre,
        ah.tipo,
        ah.color,
        ah.dias,
        ah.hora_inicio,
        ah.hora_fin,
        ah.duracion_minutos,
        ah.descripcion,
        ah.recordatorio,
        ah.es_recurrente as "esRecurrente"
      FROM actividades_horario ah
      WHERE ah.adulto_mayor_id = $1
        AND ah.activa = true
        AND (
          -- Actividades recurrentes
          (ah.es_recurrente = true AND ah.dias IS NOT NULL)
          OR
          -- Actividades no recurrentes dentro del rango
          (ah.es_recurrente = false AND 
           (ah.fecha_inicio <= $3 OR (ah.fecha_fin IS NULL OR ah.fecha_fin >= $2)))
        )
      ORDER BY ah.hora_inicio
    `;

    const result = await client.query(query, [
      adulto_mayor_id,
      inicioSemana.toISOString().split('T')[0],
      finSemana.toISOString().split('T')[0]
    ]);

    // Agrupar actividades por día
    const actividadesPorDia = {};
    for (let i = 0; i < 7; i++) {
      actividadesPorDia[i] = result.rows.filter(act =>
        act.dias && act.dias.includes(i)
      );
    }

    console.log(`✅ Actividades de la semana obtenidas`);

    return {
      exito: true,
      actividades_por_dia: actividadesPorDia,
      semana: {
        inicio: inicioSemana.toISOString().split('T')[0],
        fin: finSemana.toISOString().split('T')[0]
      },
      adulto_mayor_id
    };

  } catch (error) {
    console.error('❌ Error en obtenerActividadesSemana:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades',
      codigo: 'ERROR_SERVIDOR',
      actividades_por_dia: {}
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 12. Obtener resumen diario
 */
export const obtenerResumenDiario = async (usuarioId, fecha = null) => {
  try {
    console.log('📊 [HORARIO] Obteniendo resumen diario');

    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    const actividadesResult = await obtenerActividadesPorFecha(usuarioId, fechaConsulta);

    if (!actividadesResult.exito) {
      return actividadesResult;
    }

    const actividades = actividadesResult.actividades;

    // Calcular resumen
    const total_actividades = actividades.length;
    const completadas = actividades.filter(a => a.completada).length;
    const pendientes = total_actividades - completadas;
    const porcentaje_completado = total_actividades > 0
      ? Math.round((completadas / total_actividades) * 100)
      : 0;

    // Agrupar por tipo
    const por_tipo = {};
    actividades.forEach(actividad => {
      if (!por_tipo[actividad.tipo]) {
        por_tipo[actividad.tipo] = {
          total: 0,
          completadas: 0
        };
      }
      por_tipo[actividad.tipo].total++;
      if (actividad.completada) {
        por_tipo[actividad.tipo].completadas++;
      }
    });

    return {
      exito: true,
      resumen: {
        fecha: fechaConsulta,
        total_actividades,
        completadas,
        pendientes,
        porcentaje_completado,
        por_tipo,
        actividades
      }
    };

  } catch (error) {
    console.error('❌ Error en obtenerResumenDiario:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener resumen',
      codigo: 'ERROR_SERVIDOR',
      resumen: {}
    };
  }
};

/**
 * 13. Buscar conflictos de horario
 */
export const buscarConflictosHorario = async (usuarioId, datos) => {
  let client;

  try {
    console.log('⚠️ [HORARIO] Buscando conflictos de horario');

    const { dias, hora_inicio, hora_fin, actividad_id } = datos;

    // Validar datos requeridos
    if (!dias || !hora_inicio || !hora_fin) {
      return {
        exito: false,
        error: 'Los campos días, hora_inicio y hora_fin son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }

    client = await pool.connect();

    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        conflictos: [],
        tiene_conflictos: false,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }

    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Construir query según si estamos excluyendo una actividad (edición)
    let conflictQuery;
    let queryParams;

    if (actividad_id) {
      conflictQuery = `
        SELECT 
          id,
          nombre,
          tipo,
          color,
          dias,
          hora_inicio,
          hora_fin
        FROM actividades_horario
        WHERE adulto_mayor_id = $1
          AND activa = true
          AND id != $2
          AND dias && $3::jsonb
          AND (
            (hora_inicio <= $4 AND hora_fin > $4) OR
            (hora_inicio < $5 AND hora_fin >= $5) OR
            (hora_inicio >= $4 AND hora_fin <= $5)
          )
      `;

      queryParams = [
        adulto_mayor_id,
        actividad_id,
        JSON.stringify(dias),
        hora_inicio,
        hora_fin
      ];
    } else {
      conflictQuery = `
        SELECT 
          id,
          nombre,
          tipo,
          color,
          dias,
          hora_inicio,
          hora_fin
        FROM actividades_horario
        WHERE adulto_mayor_id = $1
          AND activa = true
          AND dias && $2::jsonb
          AND (
            (hora_inicio <= $3 AND hora_fin > $3) OR
            (hora_inicio < $4 AND hora_fin >= $4) OR
            (hora_inicio >= $3 AND hora_fin <= $4)
          )
      `;

      queryParams = [
        adulto_mayor_id,
        JSON.stringify(dias),
        hora_inicio,
        hora_fin
      ];
    }

    const result = await client.query(conflictQuery, queryParams);

    const conflictos = result.rows.map(c => ({
      ...c,
      dias: c.dias || []
    }));

    console.log(`✅ Encontrados ${conflictos.length} conflictos`);

    return {
      exito: true,
      conflictos,
      tiene_conflictos: conflictos.length > 0,
      adulto_mayor_id
    };

  } catch (error) {
    console.error('❌ Error en buscarConflictosHorario:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al buscar conflictos',
      codigo: 'ERROR_SERVIDOR',
      conflictos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 14. Obtener actividades predefinidas
 */
export const obtenerActividadesPredefinidas = async () => {
  try {
    console.log('📦 [HORARIO] Obteniendo actividades predefinidas');

    // Estas son actividades predefinidas estáticas que puedes personalizar
    const actividadesPredefinidas = [
      {
        id: 'banarse',
        nombre: 'Bañarse',
        categoria: 'cuidado_personal',
        color: '#1abc9c',
        duracion_minutos: 30,
        icono: 'water-outline'
      },
      {
        id: 'comer',
        nombre: 'Comer',
        categoria: 'alimentacion',
        color: '#e67e22',
        duracion_minutos: 45,
        icono: 'restaurant-outline'
      },
      {
        id: 'medicina',
        nombre: 'Tomar Medicina',
        categoria: 'salud',
        color: '#2ecc71',
        duracion_minutos: 15,
        icono: 'medical-outline'
      },
      {
        id: 'caminar',
        nombre: 'Caminar',
        categoria: 'ejercicio',
        color: '#3498db',
        duracion_minutos: 30,
        icono: 'walk-outline'
      },
      {
        id: 'descanso',
        nombre: 'Descansar',
        categoria: 'descanso',
        color: '#9b59b6',
        duracion_minutos: 60,
        icono: 'bed-outline'
      },
      {
        id: 'lectura',
        nombre: 'Lectura',
        categoria: 'recreacion',
        color: '#34495e',
        duracion_minutos: 45,
        icono: 'book-outline'
      },
      {
        id: 'ejercicios',
        nombre: 'Ejercicios',
        categoria: 'ejercicio',
        color: '#e74c3c',
        duracion_minutos: 30,
        icono: 'fitness-outline'
      },
      {
        id: 'socializar',
        nombre: 'Socializar',
        categoria: 'social',
        color: '#f39c12',
        duracion_minutos: 60,
        icono: 'people-outline'
      }
    ];

    return {
      exito: true,
      actividades: actividadesPredefinidas
    };

  } catch (error) {
    console.error('❌ Error en obtenerActividadesPredefinidas:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al obtener actividades predefinidas',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  }

};



/**
 * Crear una nueva actividad base (solo nombre, tipo, color, descripción)
 * Esto crea un registro en actividades_horario con valores por defecto para días y horarios,
 * pero sin asociación a horarios concretos. Luego el usuario podrá añadir ocurrencias.
 */
export const crearActividadBase = async (usuarioId, datos) => {
  let client;
  try {
    const { nombre, tipo, color, descripcion, emoji } = datos;
    if (!nombre) return { exito: false, error: 'Nombre requerido' };

    client = await pool.connect();
    const adultoMayorResult = await client.query(
      `SELECT am.id FROM adultos_mayores am
       INNER JOIN familiares f ON am.id = f.adulto_mayor_id
       WHERE f.usuario_id = $1
       ORDER BY f.es_principal DESC LIMIT 1`,
      [usuarioId]
    );
    if (adultoMayorResult.rows.length === 0) {
      return { exito: false, error: 'Adulto mayor no encontrado' };
    }
    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Insertar una actividad base (sin días ni horarios, se agregarán después)
    const query = `
      INSERT INTO actividades_horario (
        usuario_id, adulto_mayor_id, nombre, tipo, color, descripcion, emoji,
        dias, hora_inicio, hora_fin, duracion_minutos, es_recurrente,
        activa, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, '00:00', '00:00', 0, false, true, $1)
      RETURNING id, nombre, tipo, color, descripcion, emoji
    `;
    const result = await client.query(query, [usuarioId, adulto_mayor_id, nombre, tipo, color, descripcion, emoji || '📌']);
    return { exito: true, actividad: result.rows[0] };
  } catch (error) {
    console.error('Error en crearActividadBase:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};

/**
 * Actualizar actividad base (nombre, tipo, color, descripción) en TODAS las ocurrencias
 * que coincidan con el id de la actividad base (agrupación por nombre y adulto_mayor_id)
 * Para simplificar, actualizamos todas las filas con el mismo nombre y adulto_mayor_id
 */
export const actualizarActividadBase = async (actividadBaseId, datos) => {
  let client;
  try {
    const { nombre, tipo, color, descripcion } = datos;
    if (!nombre) return { exito: false, error: 'Nombre requerido' };

    client = await pool.connect();
    // Primero obtener el adulto_mayor_id y el nombre actual para agrupar
    const baseQuery = `SELECT adulto_mayor_id, nombre FROM actividades_horario WHERE id = $1`;
    const baseResult = await client.query(baseQuery, [actividadBaseId]);
    if (baseResult.rows.length === 0) return { exito: false, error: 'Actividad base no encontrada' };
    const { adulto_mayor_id, nombre: nombreActual } = baseResult.rows[0];

    // Actualizar todas las ocurrencias con el mismo nombre y adulto_mayor_id
    const query = `
      UPDATE actividades_horario
      SET nombre = $1, tipo = $2, color = $3, descripcion = $4, actualizado_en = NOW()
      WHERE adulto_mayor_id = $5 AND nombre = $6 AND activa = true
      RETURNING id, nombre, tipo, color, descripcion
    `;
    const result = await client.query(query, [nombre, tipo, color, descripcion, adulto_mayor_id, nombreActual]);
    return { exito: true, actualizadas: result.rowCount };
  } catch (error) {
    console.error('Error en actualizarActividadBase:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};

/**
 * Eliminar actividad base (y todas sus ocurrencias)
 */
export const eliminarActividadBase = async (actividadBaseId) => {
  let client;
  try {
    client = await pool.connect();
    // Obtener adulto_mayor_id y nombre para eliminar todas las ocurrencias
    const baseQuery = `SELECT adulto_mayor_id, nombre FROM actividades_horario WHERE id = $1`;
    const baseResult = await client.query(baseQuery, [actividadBaseId]);
    if (baseResult.rows.length === 0) return { exito: false, error: 'Actividad no encontrada' };
    const { adulto_mayor_id, nombre } = baseResult.rows[0];

    // Borrado lógico de todas las ocurrencias con ese nombre
    const query = `
      UPDATE actividades_horario
      SET activa = false, actualizado_en = NOW()
      WHERE adulto_mayor_id = $1 AND nombre = $2
    `;
    await client.query(query, [adulto_mayor_id, nombre]);
    return { exito: true };
  } catch (error) {
    console.error('Error en eliminarActividadBase:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};

// ===== FUNCIONES PARA OCURRENCIAS (horarios) =====

/**
 * Obtener ocurrencias en un rango de fechas
 */
export const obtenerOcurrenciasPorRango = async (usuarioId, fechaInicio, fechaFin) => {
  let client;
  try {
    client = await pool.connect();
    const adultoMayorResult = await client.query(
      `SELECT am.id FROM adultos_mayores am
       INNER JOIN familiares f ON am.id = f.adulto_mayor_id
       WHERE f.usuario_id = $1
       ORDER BY f.es_principal DESC LIMIT 1`,
      [usuarioId]
    );
    if (adultoMayorResult.rows.length === 0) {
      return { exito: true, ocurrencias: [] };
    }
    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    const query = `
      SELECT 
        ah.id,
        ah.nombre as actividad_base_nombre,
        ah.tipo,
        ah.color,
        ah.descripcion,
        ah.dias,
        ah.hora_inicio,
        ah.hora_fin,
        ah.duracion_minutos,
        ah.es_recurrente as "esRecurrente",
        ah.fecha_inicio,
        ah.fecha_fin,
        ah.activa
      FROM actividades_horario ah
      WHERE ah.adulto_mayor_id = $1
        AND ah.activa = true
        AND ah.dias IS NOT NULL AND jsonb_array_length(ah.dias) > 0
        AND (
          -- Recurrentes: se muestran siempre (porque aplican a todas las semanas)
          (ah.es_recurrente = true)
          OR
          -- No recurrentes: deben estar dentro del rango de fechas
          (ah.es_recurrente = false 
           AND ah.fecha_inicio <= $3 
           AND (ah.fecha_fin IS NULL OR ah.fecha_fin >= $2))
        )
      ORDER BY ah.hora_inicio
    `;
    const result = await client.query(query, [adulto_mayor_id, fechaInicio, fechaFin]);
    return { exito: true, ocurrencias: result.rows };
  } catch (error) {
    console.error('Error en obtenerOcurrenciasPorRango:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};

// ============================================================
// FUNCIONES PARA INICIALIZAR ACTIVIDADES PREDEFINIDAS
// ============================================================

/**
 * Obtener o crear actividades predefinidas para un adulto mayor
 */
const obtenerOCrearPredefinidas = async (adulto_mayor_id, usuarioId) => {
  // Lista de actividades predefinidas con sus colores y emojis
  const predefinidas = [
    { nombre: 'Bañarse', color: '#1abc9c', emoji: '🚿', tipo: 'cuidado_personal' },
    { nombre: 'Comer', color: '#e67e22', emoji: '🍽️', tipo: 'alimentacion' },
    { nombre: 'Tomar Medicina', color: '#2ecc71', emoji: '💊', tipo: 'salud' },
    { nombre: 'Caminar', color: '#3498db', emoji: '🚶', tipo: 'ejercicio' },
    { nombre: 'Descansar', color: '#9b59b6', emoji: '🛌', tipo: 'descanso' },
    { nombre: 'Lectura', color: '#34495e', emoji: '📚', tipo: 'recreacion' },
    { nombre: 'Ejercicios', color: '#e74c3c', emoji: '💪', tipo: 'ejercicio' },
    { nombre: 'Socializar', color: '#f39c12', emoji: '👪', tipo: 'social' },
  ];

  const creadas = [];
  for (const p of predefinidas) {
    // Verificar si ya existe en la BD para este adulto_mayor
    const check = await pool.query(
      `SELECT id FROM actividades_horario 
       WHERE adulto_mayor_id = $1 AND nombre = $2 AND activa = true`,
      [adulto_mayor_id, p.nombre]
    );
    if (check.rows.length === 0) {
      // Insertar predefinida
      const insert = await pool.query(
        `INSERT INTO actividades_horario (
          usuario_id, adulto_mayor_id, nombre, tipo, color, emoji,
          dias, hora_inicio, hora_fin, duracion_minutos, es_recurrente,
          activa, creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '00:00', '00:00', 0, true, true, $1)
        RETURNING id, nombre, tipo, color, emoji`,
        [usuarioId, adulto_mayor_id, p.nombre, p.tipo, p.color, p.emoji]
      );
      creadas.push(insert.rows[0]);
    } else {
      // Ya existe, obtener sus datos
      creadas.push(check.rows[0]);
    }
  }
  return creadas;
};

// ============================================================
//  ACTIVIDADES BASE (MODIFICADO)
// ============================================================

export const obtenerActividadesBase = async (usuarioId) => {
  let client;
  try {
    client = await pool.connect();
    const adultoMayorResult = await client.query(
      `SELECT am.id FROM adultos_mayores am
       INNER JOIN familiares f ON am.id = f.adulto_mayor_id
       WHERE f.usuario_id = $1
       ORDER BY f.es_principal DESC LIMIT 1`,
      [usuarioId]
    );
    if (adultoMayorResult.rows.length === 0) {
      return { exito: true, actividades: [] };
    }
    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    await obtenerOCrearPredefinidas(adulto_mayor_id, usuarioId);

    const query = `
      SELECT 
        id, 
        nombre, 
        tipo, 
        color, 
        descripcion, 
        COALESCE(emoji, '📌') as emoji,  -- 🔹 AQUÍ EL CAMBIO
        creado_en
      FROM actividades_horario
      WHERE adulto_mayor_id = $1 
        AND activa = true
      ORDER BY nombre
    `;
    const result = await client.query(query, [adulto_mayor_id]);

    return { exito: true, actividades: result.rows };
  } catch (error) {
    console.error('Error en obtenerActividadesBase:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};
// ============================================================
// CREAR OCURRENCIA (MODIFICADO - con validación mejorada)
// ============================================================

export const crearOcurrencia = async (usuarioId, datos) => {
  let client;
  try {
    const { actividad_base_id, dias, hora_inicio, hora_fin, duracion_minutos, esRecurrente, fecha_inicio, fecha_fin } = datos;

    if (!actividad_base_id || !dias || dias.length === 0 || !hora_inicio || !hora_fin) {
      return { exito: false, error: 'Faltan datos requeridos' };
    }

    client = await pool.connect();

    // Obtener adulto mayor y verificar que la actividad existe y pertenece al adulto mayor
    const adultoMayorResult = await client.query(
      `SELECT am.id FROM adultos_mayores am
       INNER JOIN familiares f ON am.id = f.adulto_mayor_id
       WHERE f.usuario_id = $1
       ORDER BY f.es_principal DESC LIMIT 1`,
      [usuarioId]
    );
    if (adultoMayorResult.rows.length === 0) {
      return { exito: false, error: 'Adulto mayor no encontrado' };
    }
    const adulto_mayor_id = adultoMayorResult.rows[0].id;

    // Verificar que la actividad base existe y pertenece a este adulto mayor
    const baseQuery = `
      SELECT nombre, tipo, color, descripcion, emoji 
      FROM actividades_horario 
      WHERE id = $1 AND adulto_mayor_id = $2 AND activa = true
    `;
    const baseResult = await client.query(baseQuery, [actividad_base_id, adulto_mayor_id]);
    if (baseResult.rows.length === 0) {
      return { exito: false, error: 'Actividad base no encontrada o no pertenece a este adulto mayor' };
    }
    const { nombre, tipo, color, descripcion, emoji } = baseResult.rows[0];

    // Insertar ocurrencia
    const query = `
      INSERT INTO actividades_horario (
        usuario_id, adulto_mayor_id, nombre, tipo, color, descripcion, emoji,
        dias, hora_inicio, hora_fin, duracion_minutos, es_recurrente,
        fecha_inicio, fecha_fin, activa, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $1)
      RETURNING *
    `;
    const values = [
      usuarioId,
      adulto_mayor_id,
      nombre,
      tipo,
      color,
      descripcion || '',
      emoji || '📌',
      JSON.stringify(dias),
      hora_inicio,
      hora_fin,
      duracion_minutos || 60,
      esRecurrente || false,
      fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin || null,
    ];
    const result = await client.query(query, values);
    return { exito: true, ocurrencia: result.rows[0] };
  } catch (error) {
    console.error('Error en crearOcurrencia:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};

// ============================================================
// ELIMINAR OCURRENCIA (MODIFICADO - para que funcione bien)
// ============================================================

export const eliminarOcurrencia = async (ocurrenciaId) => {
  let client;
  try {
    client = await pool.connect();
    const query = `UPDATE actividades_horario SET activa = false, actualizado_en = NOW() WHERE id = $1 RETURNING id`;
    const result = await client.query(query, [ocurrenciaId]);
    if (result.rowCount === 0) return { exito: false, error: 'Ocurrencia no encontrada' };
    return { exito: true };
  } catch (error) {
    console.error('Error en eliminarOcurrencia:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};


/**
 * Actualizar ocurrencia existente
 */
export const actualizarOcurrencia = async (ocurrenciaId, datos) => {
  let client;
  try {
    const { dias, hora_inicio, hora_fin, duracion_minutos, esRecurrente, fecha_inicio, fecha_fin } = datos;
    client = await pool.connect();
    // Verificar que la ocurrencia pertenece al usuario
    const checkQuery = `SELECT usuario_id FROM actividades_horario WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [ocurrenciaId]);
    if (checkResult.rows.length === 0) return { exito: false, error: 'Ocurrencia no encontrada' };

    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (dias !== undefined) { updates.push(`dias = $${paramIndex}`); values.push(JSON.stringify(dias)); paramIndex++; }
    if (hora_inicio !== undefined) { updates.push(`hora_inicio = $${paramIndex}`); values.push(hora_inicio); paramIndex++; }
    if (hora_fin !== undefined) { updates.push(`hora_fin = $${paramIndex}`); values.push(hora_fin); paramIndex++; }
    if (duracion_minutos !== undefined) { updates.push(`duracion_minutos = $${paramIndex}`); values.push(duracion_minutos); paramIndex++; }
    if (esRecurrente !== undefined) { updates.push(`es_recurrente = $${paramIndex}`); values.push(esRecurrente); paramIndex++; }
    if (fecha_inicio !== undefined) { updates.push(`fecha_inicio = $${paramIndex}`); values.push(fecha_inicio); paramIndex++; }
    if (fecha_fin !== undefined) { updates.push(`fecha_fin = $${paramIndex}`); values.push(fecha_fin); paramIndex++; }
    if (updates.length === 0) return { exito: false, error: 'Sin cambios' };

    updates.push(`actualizado_en = NOW()`);
    values.push(ocurrenciaId);
    const query = `UPDATE actividades_horario SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await client.query(query, values);
    return { exito: true, ocurrencia: result.rows[0] };
  } catch (error) {
    console.error('Error en actualizarOcurrencia:', error);
    return { exito: false, error: error.message };
  } finally {
    if (client) client.release();
  }
};


// ==================== EXPORTACIÓN ====================

export default {
  // Configuración
  obtenerConfiguracionHorario,
  guardarConfiguracionHorario,

  // Actividades CRUD
  obtenerActividadesFijas,
  crearActividad,
  actualizarActividad,
  eliminarActividad,

  // Consultas de actividades
  obtenerActividadesPorFecha,
  obtenerActividadesHoy,
  obtenerActividadesSemana,
  obtenerActividadesPorTipo,
  obtenerOcurrenciasPorRango,
  crearOcurrencia,
  actualizarOcurrencia,
  eliminarOcurrencia,

  // Registro de actividades
  registrarActividadRealizada,

  // Resúmenes y estadísticas
  obtenerResumenDiario,

  // Utilidades
  buscarConflictosHorario,
  obtenerActividadesPredefinidas
};