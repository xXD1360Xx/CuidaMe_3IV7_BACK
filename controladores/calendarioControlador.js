// controladores/calendarioControlador.js - Controlador de Calendario Unificado
import { pool } from '../configuracion/basedeDatos.js';

// ==================== FUNCIONES DE CONFIGURACIÓN ====================

/**
 * 1. Obtener configuración del calendario
 */
export const obtenerConfiguracionCalendario = async (usuarioId) => {
  let client;
  
  try {
    console.log('📅 [CALENDARIO] Obteniendo configuración para usuario ID:', usuarioId);
    
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
      SELECT * FROM configuracion_calendario 
      WHERE adulto_mayor_id = $1
    `;
    
    const configResult = await client.query(configQuery, [adulto_mayor_id]);
    
    if (configResult.rows.length === 0) {
      // Crear configuración por defecto
      const configPorDefecto = {
        vista_predeterminada: 'mes',
        mostrar_fines_semana: true,
        mostrar_feriados: true,
        mostrar_cumpleanos: true,
        mostrar_recordatorios: true,
        horas_trabajo_inicio: '08:00',
        horas_trabajo_fin: '18:00',
        recordatorio_por_defecto: true,
        recordatorio_minutos: 30,
        color_evento_por_defecto: '#4CAF50'
      };
      
      console.log('ℹ️  Creando configuración por defecto para calendario');
      
      return {
        exito: true,
        configuracion: {
          ...configPorDefecto,
          adulto_mayor_id
        }
      };
    }
    
    const configuracion = configResult.rows[0];
    
    console.log('✅ Configuración de calendario obtenida');
    
    return {
      exito: true,
      configuracion
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerConfiguracionCalendario:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener configuración del calendario',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Guardar configuración del calendario
 */
export const guardarConfiguracionCalendario = async (usuarioId, configuracion) => {
  let client;
  
  try {
    console.log('💾 [CALENDARIO] Guardando configuración por usuario ID:', usuarioId);
    
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
      SELECT id FROM configuracion_calendario 
      WHERE adulto_mayor_id = $1
    `;
    
    const checkResult = await client.query(checkQuery, [adulto_mayor_id]);
    
    let resultado;
    
    if (checkResult.rows.length > 0) {
      // Actualizar configuración existente
      const updateQuery = `
        UPDATE configuracion_calendario 
        SET vista_predeterminada = $1, 
            mostrar_fines_semana = $2, 
            mostrar_feriados = $3, 
            mostrar_cumpleanos = $4, 
            mostrar_recordatorios = $5,
            horas_trabajo_inicio = $6,
            horas_trabajo_fin = $7,
            recordatorio_por_defecto = $8,
            recordatorio_minutos = $9,
            color_evento_por_defecto = $10,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE adulto_mayor_id = $11
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        configuracion.vista_predeterminada || 'mes',
        configuracion.mostrar_fines_semana !== undefined ? configuracion.mostrar_fines_semana : true,
        configuracion.mostrar_feriados !== undefined ? configuracion.mostrar_feriados : true,
        configuracion.mostrar_cumpleanos !== undefined ? configuracion.mostrar_cumpleanos : true,
        configuracion.mostrar_recordatorios !== undefined ? configuracion.mostrar_recordatorios : true,
        configuracion.horas_trabajo_inicio || '08:00',
        configuracion.horas_trabajo_fin || '18:00',
        configuracion.recordatorio_por_defecto !== undefined ? configuracion.recordatorio_por_defecto : true,
        configuracion.recordatorio_minutos || 30,
        configuracion.color_evento_por_defecto || '#4CAF50',
        adulto_mayor_id
      ]);
      
      resultado = updateResult.rows[0];
    } else {
      // Insertar nueva configuración
      const insertQuery = `
        INSERT INTO configuracion_calendario (
          adulto_mayor_id, 
          vista_predeterminada, 
          mostrar_fines_semana, 
          mostrar_feriados, 
          mostrar_cumpleanos, 
          mostrar_recordatorios,
          horas_trabajo_inicio,
          horas_trabajo_fin,
          recordatorio_por_defecto,
          recordatorio_minutos,
          color_evento_por_defecto
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        adulto_mayor_id,
        configuracion.vista_predeterminada || 'mes',
        configuracion.mostrar_fines_semana !== undefined ? configuracion.mostrar_fines_semana : true,
        configuracion.mostrar_feriados !== undefined ? configuracion.mostrar_feriados : true,
        configuracion.mostrar_cumpleanos !== undefined ? configuracion.mostrar_cumpleanos : true,
        configuracion.mostrar_recordatorios !== undefined ? configuracion.mostrar_recordatorios : true,
        configuracion.horas_trabajo_inicio || '08:00',
        configuracion.horas_trabajo_fin || '18:00',
        configuracion.recordatorio_por_defecto !== undefined ? configuracion.recordatorio_por_defecto : true,
        configuracion.recordatorio_minutos || 30,
        configuracion.color_evento_por_defecto || '#4CAF50'
      ]);
      
      resultado = insertResult.rows[0];
    }
    
    console.log('✅ Configuración del calendario guardada exitosamente');
    
    return {
      exito: true,
      configuracion: resultado,
      mensaje: 'Configuración del calendario guardada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en guardarConfiguracionCalendario:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al guardar configuración del calendario',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE EVENTOS ====================

/**
 * 3. Obtener todos los eventos
 */
export const obtenerEventos = async (usuarioId) => {
  let client;
  
  try {
    console.log('📅 [CALENDARIO] Obteniendo eventos para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    if (adultosMayoresResult.rows.length === 0) {
      return {
        exito: true,
        eventos: [],
        mensaje: 'No se encontraron adultos mayores asociados'
      };
    }
    
    const adultos_mayores_ids = adultosMayoresResult.rows.map(row => row.id);
    
    // Obtener eventos de todos los adultos mayores asociados
    const query = `
      SELECT 
        e.id,
        e.titulo,
        e.tipo_evento,
        e.color_evento,
        e.fecha_inicio,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.duracion_horas,
        e.descripcion,
        e.recordatorio,
        e.recordatorio_minutos,
        e.ubicacion,
        e.recurrente,
        e.recurrencia_patron,
        e.familiar_id,
        f.nombre as familiar_nombre,
        am.nombre as adulto_mayor_nombre,
        e.usuario_id,
        e.creado_en,
        e.actualizado_en
      FROM eventos e
      LEFT JOIN familiares f ON e.familiar_id = f.id
      LEFT JOIN adultos_mayores am ON e.adulto_mayor_id = am.id
      WHERE e.usuario_id = $1
         OR e.adulto_mayor_id = ANY($2::int[])
         OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
           SELECT id FROM familiares WHERE usuario_id = $1
         ))
      ORDER BY e.fecha_inicio DESC, e.hora_inicio
    `;
    
    const result = await client.query(query, [usuarioId, adultos_mayores_ids]);
    
    console.log(`✅ Encontrados ${result.rows.length} eventos`);
    
    return {
      exito: true,
      eventos: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEventos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 4. Obtener eventos por rango de fechas
 */
export const obtenerEventosPorRango = async (usuarioId, fechaInicio, fechaFin) => {
  let client;
  
  try {
    console.log('📅 [CALENDARIO] Obteniendo eventos por rango:', fechaInicio, '-', fechaFin);
    
    // Validar formato de fechas
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaInicio) || !fechaRegex.test(fechaFin)) {
      return { 
        exito: false, 
        error: 'Formato de fecha inválido. Use YYYY-MM-DD',
        codigo: 'FECHA_FORMATO_INVALIDO'
      };
    }
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    const eventos = [];
    
    if (adultosMayoresResult.rows.length > 0) {
      const adultos_mayores_ids = adultosMayoresResult.rows.map(row => row.id);
      
      // Obtener eventos en el rango especificado
      const query = `
        SELECT 
          e.id,
          e.titulo,
          e.tipo_evento,
          e.color_evento,
          e.fecha_inicio,
          e.fecha_fin,
          e.hora_inicio,
          e.hora_fin,
          e.duracion_horas,
          e.descripcion,
          e.recordatorio,
          e.recordatorio_minutos,
          e.ubicacion,
          e.recurrente,
          e.recurrencia_patron,
          e.familiar_id,
          f.nombre as familiar_nombre,
          am.nombre as adulto_mayor_nombre,
          e.usuario_id,
          e.creado_en
        FROM eventos e
        LEFT JOIN familiares f ON e.familiar_id = f.id
        LEFT JOIN adultos_mayores am ON e.adulto_mayor_id = am.id
        WHERE (
          -- Eventos que empiezan en el rango
          (e.fecha_inicio BETWEEN $1 AND $2)
          OR
          -- Eventos que terminan en el rango
          (e.fecha_fin BETWEEN $1 AND $2)
          OR
          -- Eventos que abarcan el rango
          (e.fecha_inicio <= $1 AND e.fecha_fin >= $2)
        )
        AND (
          e.usuario_id = $3
          OR e.adulto_mayor_id = ANY($4::int[])
          OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
            SELECT id FROM familiares WHERE usuario_id = $3
          ))
        )
        ORDER BY e.fecha_inicio, e.hora_inicio
      `;
      
      const result = await client.query(query, [
        fechaInicio, 
        fechaFin, 
        usuarioId, 
        adultos_mayores_ids
      ]);
      
      eventos.push(...result.rows);
    }
    
    // También obtener eventos creados por el usuario directamente
    const eventosUsuarioQuery = `
      SELECT 
        e.id,
        e.titulo,
        e.tipo_evento,
        e.color_evento,
        e.fecha_inicio,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.duracion_horas,
        e.descripcion,
        e.recordatorio,
        e.recordatorio_minutos,
        e.ubicacion,
        e.recurrente,
        e.recurrencia_patron,
        e.familiar_id,
        f.nombre as familiar_nombre,
        NULL as adulto_mayor_nombre,
        e.usuario_id,
        e.creado_en
      FROM eventos e
      LEFT JOIN familiares f ON e.familiar_id = f.id
      WHERE e.usuario_id = $1
        AND (
          (e.fecha_inicio BETWEEN $2 AND $3)
          OR (e.fecha_fin BETWEEN $2 AND $3)
          OR (e.fecha_inicio <= $2 AND e.fecha_fin >= $3)
        )
      ORDER BY e.fecha_inicio, e.hora_inicio
    `;
    
    const eventosUsuarioResult = await client.query(eventosUsuarioQuery, [
      usuarioId, 
      fechaInicio, 
      fechaFin
    ]);
    
    // Combinar eventos únicos
    const eventosMap = new Map();
    
    [...eventos, ...eventosUsuarioResult.rows].forEach(evento => {
      if (!eventosMap.has(evento.id)) {
        eventosMap.set(evento.id, evento);
      }
    });
    
    const eventosUnicos = Array.from(eventosMap.values());
    
    console.log(`✅ Encontrados ${eventosUnicos.length} eventos en el rango`);
    
    return {
      exito: true,
      eventos: eventosUnicos,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      total: eventosUnicos.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEventosPorRango:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos por rango',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Obtener eventos por fecha específica
 */
export const obtenerEventosPorFecha = async (usuarioId, fecha) => {
  try {
    console.log('📅 [CALENDARIO] Obteniendo eventos para fecha:', fecha);
    
    return await obtenerEventosPorRango(usuarioId, fecha, fecha);
    
  } catch (error) {
    console.error('❌ Error en obtenerEventosPorFecha:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos por fecha',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  }
};

/**
 * 6. Obtener eventos próximos
 */
export const obtenerEventosProximos = async (usuarioId, limite = 10) => {
  let client;
  
  try {
    console.log('📅 [CALENDARIO] Obteniendo próximos eventos, límite:', limite);
    
    const hoy = new Date().toISOString().split('T')[0];
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    const eventos = [];
    
    if (adultosMayoresResult.rows.length > 0) {
      const adultos_mayores_ids = adultosMayoresResult.rows.map(row => row.id);
      
      // Obtener eventos próximos (desde hoy en adelante)
      const query = `
        SELECT 
          e.id,
          e.titulo,
          e.tipo_evento,
          e.color_evento,
          e.fecha_inicio,
          e.fecha_fin,
          e.hora_inicio,
          e.hora_fin,
          e.duracion_horas,
          e.descripcion,
          e.recordatorio,
          e.recordatorio_minutos,
          e.ubicacion,
          e.recurrente,
          e.familiar_id,
          f.nombre as familiar_nombre,
          am.nombre as adulto_mayor_nombre,
          e.usuario_id,
          e.creado_en
        FROM eventos e
        LEFT JOIN familiares f ON e.familiar_id = f.id
        LEFT JOIN adultos_mayores am ON e.adulto_mayor_id = am.id
        WHERE (
          e.fecha_inicio >= $1 
          OR e.fecha_fin >= $1
        )
        AND (
          e.usuario_id = $2
          OR e.adulto_mayor_id = ANY($3::int[])
          OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
            SELECT id FROM familiares WHERE usuario_id = $2
          ))
        )
        ORDER BY e.fecha_inicio, e.hora_inicio
        LIMIT $4
      `;
      
      const result = await client.query(query, [
        hoy, 
        usuarioId, 
        adultos_mayores_ids,
        limite
      ]);
      
      eventos.push(...result.rows);
    }
    
    // También obtener eventos del usuario
    const eventosUsuarioQuery = `
      SELECT 
        e.id,
        e.titulo,
        e.tipo_evento,
        e.color_evento,
        e.fecha_inicio,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.duracion_horas,
        e.descripcion,
        e.recordatorio,
        e.recordatorio_minutos,
        e.ubicacion,
        e.recurrente,
        e.familiar_id,
        f.nombre as familiar_nombre,
        NULL as adulto_mayor_nombre,
        e.usuario_id,
        e.creado_en
      FROM eventos e
      LEFT JOIN familiares f ON e.familiar_id = f.id
      WHERE e.usuario_id = $1
        AND (e.fecha_inicio >= $2 OR e.fecha_fin >= $2)
      ORDER BY e.fecha_inicio, e.hora_inicio
      LIMIT $3
    `;
    
    const eventosUsuarioResult = await client.query(eventosUsuarioQuery, [
      usuarioId, 
      hoy, 
      limite
    ]);
    
    // Combinar y eliminar duplicados
    const eventosMap = new Map();
    
    [...eventos, ...eventosUsuarioResult.rows].forEach(evento => {
      if (!eventosMap.has(evento.id)) {
        eventosMap.set(evento.id, evento);
      }
    });
    
    const eventosUnicos = Array.from(eventosMap.values())
      .sort((a, b) => {
        const fechaA = new Date(`${a.fecha_inicio}T${a.hora_inicio || '00:00'}`);
        const fechaB = new Date(`${b.fecha_inicio}T${b.hora_inicio || '00:00'}`);
        return fechaA - fechaB;
      })
      .slice(0, limite);
    
    console.log(`✅ Encontrados ${eventosUnicos.length} eventos próximos`);
    
    return {
      exito: true,
      eventos: eventosUnicos,
      fecha_consulta: hoy,
      total: eventosUnicos.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEventosProximos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos próximos',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Crear evento
 */
export const crearEvento = async (usuarioId, evento) => {
  let client;
  
  try {
    console.log('➕ [CALENDARIO] Creando evento para usuario ID:', usuarioId);
    
    // Validar datos requeridos
    const camposRequeridos = ['titulo', 'fecha_inicio'];
    for (const campo of camposRequeridos) {
      if (!evento[campo]) {
        return { 
          exito: false, 
          error: `El campo ${campo} es requerido`,
          codigo: 'DATOS_INCOMPLETOS'
        };
      }
    }
    
    client = await pool.connect();
    
    let adulto_mayor_id = null;
    
    // Si se proporciona adulto_mayor_id, verificar que el usuario tenga acceso
    if (evento.adulto_mayor_id) {
      const accesoQuery = `
        SELECT 1 FROM familiares 
        WHERE usuario_id = $1 AND adulto_mayor_id = $2
      `;
      
      const accesoResult = await client.query(accesoQuery, [
        usuarioId, 
        evento.adulto_mayor_id
      ]);
      
      if (accesoResult.rows.length === 0) {
        return { 
          exito: false, 
          error: 'No tienes acceso a este adulto mayor',
          codigo: 'SIN_ACCESO'
        };
      }
      
      adulto_mayor_id = evento.adulto_mayor_id;
    }
    
    // Si se proporciona familiar_id, verificar que pertenezca al usuario
    if (evento.familiar_id) {
      const familiarQuery = `
        SELECT 1 FROM familiares 
        WHERE id = $1 AND usuario_id = $2
      `;
      
      const familiarResult = await client.query(familiarQuery, [
        evento.familiar_id, 
        usuarioId
      ]);
      
      if (familiarResult.rows.length === 0) {
        return { 
          exito: false, 
          error: 'El familiar no pertenece al usuario',
          codigo: 'FAMILIAR_NO_VALIDO'
        };
      }
    }
    
    // Validar fechas
    if (evento.fecha_fin && evento.fecha_fin < evento.fecha_inicio) {
      return { 
        exito: false, 
        error: 'La fecha de fin no puede ser anterior a la fecha de inicio',
        codigo: 'FECHAS_INVALIDAS'
      };
    }
    
    // Verificar conflicto de eventos
    if (evento.adulto_mayor_id) {
      const conflictQuery = `
        SELECT id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin
        FROM eventos
        WHERE adulto_mayor_id = $1
          AND (
            (fecha_inicio <= $2 AND (fecha_fin IS NULL OR fecha_fin >= $2))
            OR (fecha_inicio <= $3 AND (fecha_fin IS NULL OR fecha_fin >= $3))
            OR ($2 <= fecha_inicio AND $3 >= (fecha_fin OR fecha_inicio))
          )
      `;
      
      const conflictResult = await client.query(conflictQuery, [
        adulto_mayor_id,
        evento.fecha_inicio,
        evento.fecha_fin || evento.fecha_inicio
      ]);
      
      if (conflictResult.rows.length > 0 && evento.verificar_conflictos !== false) {
        const conflicto = conflictResult.rows[0];
        return { 
          exito: false, 
          error: `Conflicto de horario con "${conflicto.titulo}"`,
          codigo: 'CONFLICTO_HORARIO'
        };
      }
    }
    
    // Insertar nuevo evento
    const query = `
      INSERT INTO eventos (
        titulo,
        tipo_evento,
        color_evento,
        fecha_inicio,
        fecha_fin,
        hora_inicio,
        hora_fin,
        duracion_horas,
        descripcion,
        recordatorio,
        recordatorio_minutos,
        ubicacion,
        recurrente,
        recurrencia_patron,
        familiar_id,
        adulto_mayor_id,
        usuario_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      evento.titulo.trim(),
      evento.tipo_evento || 'cita_medica',
      evento.color_evento || '#4CAF50',
      evento.fecha_inicio,
      evento.fecha_fin || evento.fecha_inicio,
      evento.hora_inicio || null,
      evento.hora_fin || null,
      evento.duracion_horas || 1,
      evento.descripcion || '',
      evento.recordatorio !== undefined ? evento.recordatorio : true,
      evento.recordatorio_minutos || 30,
      evento.ubicacion || '',
      evento.recurrente || false,
      evento.recurrencia_patron || null,
      evento.familiar_id || null,
      adulto_mayor_id,
      usuarioId
    ];
    
    const result = await client.query(query, values);
    
    const nuevoEvento = result.rows[0];
    
    console.log('✅ Evento creado exitosamente:', nuevoEvento.titulo);
    
    return {
      exito: true,
      evento: nuevoEvento,
      mensaje: 'Evento creado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en crearEvento:', error.message);
    
    if (error.code === '23505') {
      return { 
        exito: false, 
        error: 'El evento ya existe',
        codigo: 'EVENTO_DUPLICADO'
      };
    }
    
    return { 
      exito: false, 
      error: 'Error del servidor al crear evento',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 8. Actualizar evento
 */
export const actualizarEvento = async (eventoId, usuarioId, evento) => {
  let client;
  
  try {
    console.log('✏️ [CALENDARIO] Actualizando evento ID:', eventoId);
    
    client = await pool.connect();
    
    // Verificar que el evento existe y pertenece al usuario
    const verifyQuery = `
      SELECT e.id, e.usuario_id, e.adulto_mayor_id
      FROM eventos e
      WHERE e.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [eventoId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Evento no encontrado',
        codigo: 'EVENTO_NO_ENCONTRADO'
      };
    }
    
    const eventoExistente = verifyResult.rows[0];
    
    // Verificar permisos
    if (eventoExistente.usuario_id !== usuarioId) {
      // Si no es el creador, verificar si es familiar del adulto mayor
      if (eventoExistente.adulto_mayor_id) {
        const accesoQuery = `
          SELECT 1 FROM familiares 
          WHERE usuario_id = $1 AND adulto_mayor_id = $2
        `;
        
        const accesoResult = await client.query(accesoQuery, [
          usuarioId, 
          eventoExistente.adulto_mayor_id
        ]);
        
        if (accesoResult.rows.length === 0) {
          return { 
            exito: false, 
            error: 'No tienes permiso para modificar este evento',
            codigo: 'SIN_PERMISOS'
          };
        }
      } else {
        return { 
          exito: false, 
          error: 'No tienes permiso para modificar este evento',
          codigo: 'SIN_PERMISOS'
        };
      }
    }
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const camposPermitidos = [
      'titulo', 'tipo_evento', 'color_evento', 'fecha_inicio', 'fecha_fin',
      'hora_inicio', 'hora_fin', 'duracion_horas', 'descripcion', 'recordatorio',
      'recordatorio_minutos', 'ubicacion', 'recurrente', 'recurrencia_patron',
      'familiar_id'
    ];
    
    for (const campo of camposPermitidos) {
      if (evento[campo] !== undefined) {
        updates.push(`${campo} = $${paramIndex}`);
        values.push(evento[campo]);
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
    
    values.push(eventoId);
    
    const query = `
      UPDATE eventos 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    const eventoActualizado = result.rows[0];
    
    console.log('✅ Evento actualizado exitosamente');
    
    return {
      exito: true,
      evento: eventoActualizado,
      mensaje: 'Evento actualizado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarEvento:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar evento',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Eliminar evento
 */
export const eliminarEvento = async (eventoId, usuarioId) => {
  let client;
  
  try {
    console.log('🗑️ [CALENDARIO] Eliminando evento ID:', eventoId);
    
    client = await pool.connect();
    
    // Verificar que el evento existe y pertenece al usuario
    const verifyQuery = `
      SELECT e.id, e.usuario_id, e.adulto_mayor_id
      FROM eventos e
      WHERE e.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [eventoId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Evento no encontrado',
        codigo: 'EVENTO_NO_ENCONTRADO'
      };
    }
    
    const eventoExistente = verifyResult.rows[0];
    
    // Verificar permisos
    if (eventoExistente.usuario_id !== usuarioId) {
      // Si no es el creador, verificar si es familiar del adulto mayor
      if (eventoExistente.adulto_mayor_id) {
        const accesoQuery = `
          SELECT 1 FROM familiares 
          WHERE usuario_id = $1 AND adulto_mayor_id = $2
        `;
        
        const accesoResult = await client.query(accesoQuery, [
          usuarioId, 
          eventoExistente.adulto_mayor_id
        ]);
        
        if (accesoResult.rows.length === 0) {
          return { 
            exito: false, 
            error: 'No tienes permiso para eliminar este evento',
            codigo: 'SIN_PERMISOS'
          };
        }
      } else {
        return { 
          exito: false, 
          error: 'No tienes permiso para eliminar este evento',
          codigo: 'SIN_PERMISOS'
        };
      }
    }
    
    // Eliminar evento
    const deleteQuery = `
      DELETE FROM eventos 
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [eventoId]);
    
    console.log('✅ Evento eliminado exitosamente');
    
    return {
      exito: true,
      mensaje: 'Evento eliminado correctamente',
      id: result.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error en eliminarEvento:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al eliminar evento',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 10. Obtener eventos por tipo
 */
export const obtenerEventosPorTipo = async (usuarioId, tipo) => {
  let client;
  
  try {
    console.log('🏷️ [CALENDARIO] Obteniendo eventos por tipo:', tipo);
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    let eventos = [];
    
    if (adultosMayoresResult.rows.length > 0) {
      const adultos_mayores_ids = adultosMayoresResult.rows.map(row => row.id);
      
      const query = `
        SELECT 
          e.id,
          e.titulo,
          e.tipo_evento,
          e.color_evento,
          e.fecha_inicio,
          e.fecha_fin,
          e.hora_inicio,
          e.hora_fin,
          e.duracion_horas,
          e.descripcion,
          e.recordatorio,
          e.recordatorio_minutos,
          e.ubicacion,
          e.recurrente,
          e.familiar_id,
          f.nombre as familiar_nombre,
          am.nombre as adulto_mayor_nombre,
          e.usuario_id,
          e.creado_en
        FROM eventos e
        LEFT JOIN familiares f ON e.familiar_id = f.id
        LEFT JOIN adultos_mayores am ON e.adulto_mayor_id = am.id
        WHERE e.tipo_evento = $1
          AND (
            e.usuario_id = $2
            OR e.adulto_mayor_id = ANY($3::int[])
            OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
              SELECT id FROM familiares WHERE usuario_id = $2
            ))
          )
        ORDER BY e.fecha_inicio DESC
      `;
      
      const result = await client.query(query, [
        tipo, 
        usuarioId, 
        adultos_mayores_ids
      ]);
      
      eventos = result.rows;
    }
    
    // También obtener eventos del usuario
    const eventosUsuarioQuery = `
      SELECT 
        e.id,
        e.titulo,
        e.tipo_evento,
        e.color_evento,
        e.fecha_inicio,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.duracion_horas,
        e.descripcion,
        e.recordatorio,
        e.recordatorio_minutos,
        e.ubicacion,
        e.recurrente,
        e.familiar_id,
        f.nombre as familiar_nombre,
        NULL as adulto_mayor_nombre,
        e.usuario_id,
        e.creado_en
      FROM eventos e
      LEFT JOIN familiares f ON e.familiar_id = f.id
      WHERE e.usuario_id = $1 AND e.tipo_evento = $2
      ORDER BY e.fecha_inicio DESC
    `;
    
    const eventosUsuarioResult = await client.query(eventosUsuarioQuery, [
      usuarioId, 
      tipo
    ]);
    
    // Combinar eventos únicos
    const eventosMap = new Map();
    
    [...eventos, ...eventosUsuarioResult.rows].forEach(evento => {
      if (!eventosMap.has(evento.id)) {
        eventosMap.set(evento.id, evento);
      }
    });
    
    const eventosUnicos = Array.from(eventosMap.values());
    
    console.log(`✅ Encontrados ${eventosUnicos.length} eventos tipo "${tipo}"`);
    
    return {
      exito: true,
      tipo,
      eventos: eventosUnicos,
      total: eventosUnicos.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEventosPorTipo:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos por tipo',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 11. Obtener eventos de hoy
 */
export const obtenerEventosHoy = async (usuarioId) => {
  try {
    console.log('📝 [CALENDARIO] Obteniendo eventos para hoy');
    
    const hoy = new Date().toISOString().split('T')[0];
    return await obtenerEventosPorFecha(usuarioId, hoy);
    
  } catch (error) {
    console.error('❌ Error en obtenerEventosHoy:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener eventos de hoy',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  }
};

/**
 * 12. Obtener estadísticas de eventos
 */
export const obtenerEstadisticasEventos = async (usuarioId, fechaInicio = null, fechaFin = null) => {
  let client;
  
  try {
    console.log('📊 [CALENDARIO] Obteniendo estadísticas de eventos');
    
    const hoy = new Date();
    const inicioMes = fechaInicio || new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = fechaFin || new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    const adultos_mayores_ids = adultosMayoresResult.rows.length > 0 
      ? adultosMayoresResult.rows.map(row => row.id) 
      : [];
    
    // Consulta para estadísticas
    const query = `
      SELECT 
        -- Total de eventos
        COUNT(*) as total_eventos,
        
        -- Por tipo de evento
        COUNT(CASE WHEN tipo_evento = 'cita_medica' THEN 1 END) as citas_medicas,
        COUNT(CASE WHEN tipo_evento = 'visita' THEN 1 END) as visitas,
        COUNT(CASE WHEN tipo_evento = 'evento_social' THEN 1 END) as eventos_sociales,
        COUNT(CASE WHEN tipo_evento = 'cuidado_familiar' THEN 1 END) as cuidados_familiares,
        COUNT(CASE WHEN tipo_evento = 'terapia' THEN 1 END) as terapias,
        COUNT(CASE WHEN tipo_evento = 'vacaciones' THEN 1 END) as vacaciones,
        COUNT(CASE WHEN tipo_evento = 'reunion' THEN 1 END) as reuniones,
        COUNT(CASE WHEN tipo_evento = 'otro' THEN 1 END) as otros,
        
        -- Por estado (próximos vs pasados)
        COUNT(CASE WHEN fecha_inicio >= $3 THEN 1 END) as eventos_proximos,
        COUNT(CASE WHEN fecha_inicio < $3 THEN 1 END) as eventos_pasados,
        
        -- Con recordatorio
        COUNT(CASE WHEN recordatorio = true THEN 1 END) as con_recordatorio,
        
        -- Eventos recurrentes
        COUNT(CASE WHEN recurrente = true THEN 1 END) as eventos_recurrentes
        
      FROM eventos e
      WHERE (
        e.usuario_id = $1
        OR e.adulto_mayor_id = ANY($2::int[])
        OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
          SELECT id FROM familiares WHERE usuario_id = $1
        ))
      )
      AND (
        (e.fecha_inicio BETWEEN $4 AND $5)
        OR (e.fecha_fin BETWEEN $4 AND $5)
        OR (e.fecha_inicio <= $4 AND (e.fecha_fin IS NULL OR e.fecha_fin >= $5))
      )
    `;
    
    const result = await client.query(query, [
      usuarioId,
      adultos_mayores_ids,
      hoy.toISOString().split('T')[0],
      inicioMes,
      finMes
    ]);
    
    const estadisticas = result.rows[0];
    
    // Calcular porcentajes
    if (estadisticas.total_eventos > 0) {
      estadisticas.porcentaje_citas_medicas = Math.round((estadisticas.citas_medicas / estadisticas.total_eventos) * 100);
      estadisticas.porcentaje_visitas = Math.round((estadisticas.visitas / estadisticas.total_eventos) * 100);
      estadisticas.porcentaje_eventos_sociales = Math.round((estadisticas.eventos_sociales / estadisticas.total_eventos) * 100);
      estadisticas.porcentaje_cuidados_familiares = Math.round((estadisticas.cuidados_familiares / estadisticas.total_eventos) * 100);
      estadisticas.porcentaje_terapias = Math.round((estadisticas.terapias / estadisticas.total_eventos) * 100);
      estadisticas.porcentaje_con_recordatorio = Math.round((estadisticas.con_recordatorio / estadisticas.total_eventos) * 100);
    } else {
      estadisticas.porcentaje_citas_medicas = 0;
      estadisticas.porcentaje_visitas = 0;
      estadisticas.porcentaje_eventos_sociales = 0;
      estadisticas.porcentaje_cuidados_familiares = 0;
      estadisticas.porcentaje_terapias = 0;
      estadisticas.porcentaje_con_recordatorio = 0;
    }
    
    console.log('✅ Estadísticas obtenidas:', estadisticas.total_eventos, 'eventos');
    
    return {
      exito: true,
      estadisticas: {
        ...estadisticas,
        periodo: {
          inicio: inicioMes,
          fin: finMes
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasEventos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener estadísticas',
      codigo: 'ERROR_SERVIDOR',
      estadisticas: {}
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 13. Buscar eventos
 */
export const buscarEventos = async (usuarioId, busqueda) => {
  let client;
  
  try {
    console.log('🔍 [CALENDARIO] Buscando eventos:', busqueda);
    
    if (!busqueda || busqueda.trim().length < 2) {
      return {
        exito: true,
        eventos: [],
        busqueda,
        mensaje: 'Término de búsqueda muy corto'
      };
    }
    
    const termino = `%${busqueda.trim()}%`;
    
    client = await pool.connect();
    
    // Obtener todos los adultos mayores asociados al usuario
    const adultosMayoresQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
    `;
    
    const adultosMayoresResult = await client.query(adultosMayoresQuery, [usuarioId]);
    
    const adultos_mayores_ids = adultosMayoresResult.rows.length > 0 
      ? adultosMayoresResult.rows.map(row => row.id) 
      : [];
    
    // Buscar en eventos
    const query = `
      SELECT 
        e.id,
        e.titulo,
        e.tipo_evento,
        e.color_evento,
        e.fecha_inicio,
        e.fecha_fin,
        e.hora_inicio,
        e.hora_fin,
        e.duracion_horas,
        e.descripcion,
        e.recordatorio,
        e.recordatorio_minutos,
        e.ubicacion,
        e.recurrente,
        e.familiar_id,
        f.nombre as familiar_nombre,
        am.nombre as adulto_mayor_nombre,
        e.usuario_id,
        e.creado_en
      FROM eventos e
      LEFT JOIN familiares f ON e.familiar_id = f.id
      LEFT JOIN adultos_mayores am ON e.adulto_mayor_id = am.id
      WHERE (
        e.usuario_id = $1
        OR e.adulto_mayor_id = ANY($2::int[])
        OR (e.familiar_id IS NOT NULL AND e.familiar_id IN (
          SELECT id FROM familiares WHERE usuario_id = $1
        ))
      )
      AND (
        LOWER(e.titulo) LIKE LOWER($3)
        OR LOWER(e.descripcion) LIKE LOWER($3)
        OR LOWER(e.ubicacion) LIKE LOWER($3)
        OR LOWER(e.tipo_evento) LIKE LOWER($3)
      )
      ORDER BY 
        CASE 
          WHEN LOWER(e.titulo) LIKE LOWER($3) THEN 1
          WHEN LOWER(e.descripcion) LIKE LOWER($3) THEN 2
          ELSE 3
        END,
        e.fecha_inicio DESC
      LIMIT 50
    `;
    
    const result = await client.query(query, [
      usuarioId,
      adultos_mayores_ids,
      termino
    ]);
    
    console.log(`✅ Encontrados ${result.rows.length} eventos para "${busqueda}"`);
    
    return {
      exito: true,
      eventos: result.rows,
      busqueda,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en buscarEventos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al buscar eventos',
      codigo: 'ERROR_SERVIDOR',
      eventos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 14. Obtener tipos de eventos predefinidos
 */
export const obtenerTiposEventosPredefinidos = async () => {
  try {
    console.log('📦 [CALENDARIO] Obteniendo tipos de eventos predefinidos');
    
    // Tipos de eventos predefinidos con iconos y colores
    const tiposEventosPredefinidos = [
      {
        id: 'cita_medica',
        nombre: 'Cita Médica',
        color: '#4CAF50',
        icono: 'medical-outline',
        descripcion: 'Citas médicas, consultas, exámenes'
      },
      {
        id: 'visita',
        nombre: 'Visita Familiar',
        color: '#2196F3',
        icono: 'people-outline',
        descripcion: 'Visitas de familiares o amigos'
      },
      {
        id: 'evento_social',
        nombre: 'Evento Social',
        color: '#9C27B0',
        icono: 'wine-outline',
        descripcion: 'Fiestas, reuniones sociales, celebraciones'
      },
      {
        id: 'cuidado_familiar',
        nombre: 'Cuidado Familiar',
        color: '#FF9800',
        icono: 'heart-outline',
        descripcion: 'Actividades de cuidado personal'
      },
      {
        id: 'terapia',
        nombre: 'Terapia',
        color: '#00BCD4',
        icono: 'fitness-outline',
        descripcion: 'Sesiones de terapia física o psicológica'
      },
      {
        id: 'vacaciones',
        nombre: 'Vacaciones',
        color: '#FF5722',
        icono: 'airplane-outline',
        descripcion: 'Viajes, descansos, días libres'
      },
      {
        id: 'reunion',
        nombre: 'Reunión',
        color: '#E91E63',
        icono: 'chatbubble-outline',
        descripcion: 'Reuniones formales o informales'
      },
      {
        id: 'recordatorio',
        nombre: 'Recordatorio',
        color: '#607D8B',
        icono: 'alarm-outline',
        descripcion: 'Recordatorios importantes'
      },
      {
        id: 'otro',
        nombre: 'Otro',
        color: '#795548',
        icono: 'ellipse-outline',
        descripcion: 'Otro tipo de evento'
      }
    ];
    
    return {
      exito: true,
      tipos_eventos: tiposEventosPredefinidos
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerTiposEventosPredefinidos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener tipos de eventos',
      codigo: 'ERROR_SERVIDOR',
      tipos_eventos: []
    };
  }
};

/**
 * 15. Obtener cumpleaños de familiares
 */
export const obtenerCumpleanosFamiliares = async (usuarioId) => {
  let client;
  
  try {
    console.log('🎂 [CALENDARIO] Obteniendo cumpleaños de familiares');
    
    client = await pool.connect();
    
    // Obtener cumpleaños de familiares del usuario
    const query = `
      SELECT 
        f.id,
        f.nombre,
        f.fecha_nacimiento,
        f.color,
        am.nombre as adulto_mayor_nombre,
        f.es_principal
      FROM familiares f
      LEFT JOIN adultos_mayores am ON f.adulto_mayor_id = am.id
      WHERE f.usuario_id = $1
        AND f.fecha_nacimiento IS NOT NULL
      ORDER BY 
        EXTRACT(MONTH FROM f.fecha_nacimiento),
        EXTRACT(DAY FROM f.fecha_nacimiento)
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    // Procesar fechas de cumpleaños
    const hoy = new Date();
    const cumpleanos = result.rows.map(familiar => {
      const fechaNac = new Date(familiar.fecha_nacimiento);
      const proximoCumpleanos = new Date(
        hoy.getFullYear(),
        fechaNac.getMonth(),
        fechaNac.getDate()
      );
      
      // Si ya pasó este año, calcular para el próximo año
      if (proximoCumpleanos < hoy) {
        proximoCumpleanos.setFullYear(hoy.getFullYear() + 1);
      }
      
      const diasRestantes = Math.ceil((proximoCumpleanos - hoy) / (1000 * 60 * 60 * 24));
      
      return {
        ...familiar,
        proximo_cumpleanos: proximoCumpleanos.toISOString().split('T')[0],
        dias_restantes: diasRestantes,
        edad_proxima: proximoCumpleanos.getFullYear() - fechaNac.getFullYear()
      };
    });
    
    // Ordenar por días restantes
    cumpleanos.sort((a, b) => a.dias_restantes - b.dias_restantes);
    
    console.log(`✅ Encontrados ${cumpleanos.length} cumpleaños`);
    
    return {
      exito: true,
      cumpleanos,
      total: cumpleanos.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerCumpleanosFamiliares:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener cumpleaños',
      codigo: 'ERROR_SERVIDOR',
      cumpleanos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== EXPORTACIÓN ====================

export default {
  // Configuración
  obtenerConfiguracionCalendario,
  guardarConfiguracionCalendario,
  
  // Eventos CRUD
  obtenerEventos,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  
  // Consultas de eventos
  obtenerEventosPorRango,
  obtenerEventosPorFecha,
  obtenerEventosHoy,
  obtenerEventosProximos,
  obtenerEventosPorTipo,
  buscarEventos,
  
  // Estadísticas y reportes
  obtenerEstadisticasEventos,
  
  // Utilidades y datos adicionales
  obtenerTiposEventosPredefinidos,
  obtenerCumpleanosFamiliares
};