// controladores/medicinasControlador.js - Controlador de Gestión de Medicinas
import { pool } from '../configuracion/basedeDatos.js';

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * 1. Obtener todas las medicinas
 */
export const obtenerTodasMedicinas = async (usuarioId) => {
  let client;
  
  try {
    console.log('💊 [MEDICINAS] Obteniendo todas las medicinas para usuario ID:', usuarioId);
    
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
        medicinas: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Obtener todas las medicinas activas
    const query = `
      SELECT 
        m.id,
        m.nombre,
        m.dosis,
        m.frecuencia,
        m.horarios,
        m.duracion_dias,
        m.proposito,
        m.instrucciones,
        m.stock_actual,
        m.stock_minimo,
        m.fecha_inicio,
        m.fecha_fin,
        m.activa,
        m.creado_en,
        m.actualizado_en,
        -- Verificar si se tomó hoy
        EXISTS(
          SELECT 1 FROM registros_medicina rm 
          WHERE rm.medicina_id = m.id 
            AND rm.fecha_toma = CURRENT_DATE
            AND rm.completada = true
        ) as tomada_hoy
      FROM medicinas m
      WHERE m.adulto_mayor_id = $1
        AND m.activa = true
      ORDER BY 
        CASE 
          WHEN m.frecuencia = 'diaria' THEN 1
          WHEN m.frecuencia = 'semanal' THEN 2
          WHEN m.frecuencia = 'mensual' THEN 3
          ELSE 4
        END,
        m.nombre
    `;
    
    const result = await client.query(query, [adulto_mayor_id]);
    
    console.log(`✅ Encontradas ${result.rows.length} medicinas`);
    
    return {
      exito: true,
      medicinas: result.rows.map(med => ({
        ...med,
        horarios: med.horarios || []
      })),
      adulto_mayor_id,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerTodasMedicinas:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicinas',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Obtener medicinas para hoy
 */
export const obtenerMedicinasHoy = async (usuarioId) => {
  let client;
  
  try {
    console.log('📅 [MEDICINAS] Obteniendo medicinas para hoy para usuario ID:', usuarioId);
    
    const hoy = new Date().toISOString().split('T')[0];
    const diaSemana = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
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
        medicinas: [],
        hoy,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Obtener medicinas que se deben tomar hoy
    const query = `
      SELECT 
        m.id,
        m.nombre,
        m.dosis,
        m.frecuencia,
        m.horarios,
        m.instrucciones,
        m.creado_en,
        -- Verificar registros de hoy por horario
        ARRAY(
          SELECT rm.horario 
          FROM registros_medicina rm 
          WHERE rm.medicina_id = m.id 
            AND rm.fecha_toma = $1
            AND rm.completada = true
        ) as horarios_tomados_hoy
      FROM medicinas m
      WHERE m.adulto_mayor_id = $2
        AND m.activa = true
        AND (
          -- Medicinas diarias
          m.frecuencia = 'diaria'
          OR
          -- Medicinas semanales (verificar día de la semana)
          (m.frecuencia = 'semanal' AND m.dias_semana @> ARRAY[$3]::int[])
          OR
          -- Medicinas con fecha específica
          (m.frecuencia = 'fecha_especifica' AND $1 BETWEEN m.fecha_inicio AND m.fecha_fin)
        )
      ORDER BY 
        CASE 
          WHEN ARRAY_POSITION(m.horarios, 'manana') IS NOT NULL THEN 1
          WHEN ARRAY_POSITION(m.horarios, 'mediodia') IS NOT NULL THEN 2
          WHEN ARRAY_POSITION(m.horarios, 'tarde') IS NOT NULL THEN 3
          WHEN ARRAY_POSITION(m.horarios, 'noche') IS NOT NULL THEN 4
          ELSE 5
        END,
        m.nombre
    `;
    
    const result = await client.query(query, [hoy, adulto_mayor_id, diaSemana]);
    
    const medicinas = result.rows.map(med => ({
      ...med,
      horarios: med.horarios || [],
      horarios_tomados_hoy: med.horarios_tomados_hoy || []
    }));
    
    console.log(`✅ Encontradas ${medicinas.length} medicinas para hoy`);
    
    return {
      exito: true,
      medicinas,
      hoy,
      dia_semana: diaSemana,
      adulto_mayor_id
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinasHoy:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicinas para hoy',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Obtener medicinas frecuentes
 */
export const obtenerMedicinasFrecuentes = async (usuarioId, limite = 5) => {
  let client;
  
  try {
    console.log('🏆 [MEDICINAS] Obteniendo medicinas frecuentes para usuario ID:', usuarioId);
    
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
        medicinas: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Obtener medicinas más frecuentes (diarias)
    const query = `
      SELECT 
        m.id,
        m.nombre,
        m.dosis,
        m.frecuencia,
        m.horarios,
        COUNT(rm.id) as veces_tomada,
        m.creado_en
      FROM medicinas m
      LEFT JOIN registros_medicina rm ON m.id = rm.medicina_id
      WHERE m.adulto_mayor_id = $1
        AND m.activa = true
        AND m.frecuencia = 'diaria'
      GROUP BY m.id, m.nombre, m.dosis, m.frecuencia, m.horarios, m.creado_en
      ORDER BY veces_tomada DESC, m.creado_en DESC
      LIMIT $2
    `;
    
    const result = await client.query(query, [adulto_mayor_id, limite]);
    
    const medicinas = result.rows.map(med => ({
      ...med,
      horarios: med.horarios || []
    }));
    
    console.log(`✅ Encontradas ${medicinas.length} medicinas frecuentes`);
    
    return {
      exito: true,
      medicinas,
      limite,
      adulto_mayor_id
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinasFrecuentes:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicinas frecuentes',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 4. Crear nueva medicina
 */
export const crearMedicina = async (usuarioId, medicina) => {
  let client;
  
  try {
    console.log('➕ [MEDICINAS] Creando nueva medicina para usuario ID:', usuarioId);
    
    // Validar datos requeridos
    const camposRequeridos = ['nombre', 'dosis', 'horarios'];
    for (const campo of camposRequeridos) {
      if (!medicina[campo] || (Array.isArray(medicina[campo]) && medicina[campo].length === 0)) {
        return { 
          exito: false, 
          error: `El campo ${campo} es requerido`,
          codigo: 'DATOS_INCOMPLETOS'
        };
      }
    }
    
    // Validar horarios
    const horariosPermitidos = ['manana', 'mediodia', 'tarde', 'noche'];
    for (const horario of medicina.horarios) {
      if (!horariosPermitidos.includes(horario)) {
        return { 
          exito: false, 
          error: `Horario inválido: ${horario}`,
          codigo: 'HORARIO_INVALIDO'
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
    
    // Verificar si ya existe una medicina similar
    const existeQuery = `
      SELECT 1 FROM medicinas 
      WHERE adulto_mayor_id = $1 
        AND LOWER(nombre) = LOWER($2)
        AND activa = true
    `;
    
    const existeResult = await client.query(existeQuery, [
      adulto_mayor_id, 
      medicina.nombre.trim()
    ]);
    
    if (existeResult.rows.length > 0) {
      return { 
        exito: false, 
        error: 'Esta medicina ya está registrada',
        codigo: 'MEDICINA_DUPLICADA'
      };
    }
    
    // Insertar nueva medicina
    const insertQuery = `
      INSERT INTO medicinas (
        adulto_mayor_id,
        nombre,
        dosis,
        frecuencia,
        horarios,
        duracion_dias,
        proposito,
        instrucciones,
        stock_actual,
        stock_minimo,
        fecha_inicio,
        fecha_fin,
        dias_semana,
        usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      adulto_mayor_id,
      medicina.nombre.trim(),
      medicina.dosis.trim(),
      medicina.frecuencia || 'diaria',
      medicina.horarios,
      medicina.duracion_dias || null,
      medicina.proposito || '',
      medicina.instrucciones || '',
      medicina.stock_actual || 30,
      medicina.stock_minimo || 10,
      medicina.fecha_inicio || new Date().toISOString().split('T')[0],
      medicina.fecha_fin || null,
      medicina.dias_semana || (medicina.frecuencia === 'semanal' ? [1,2,3,4,5,6,0] : null),
      usuarioId
    ];
    
    const result = await client.query(insertQuery, values);
    
    const nuevaMedicina = result.rows[0];
    
    console.log('✅ Medicina creada exitosamente:', nuevaMedicina.nombre);
    
    return {
      exito: true,
      medicina: nuevaMedicina,
      mensaje: 'Medicina creada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en crearMedicina:', error.message);
    
    if (error.code === '23505') {
      return { 
        exito: false, 
        error: 'La medicina ya existe',
        codigo: 'MEDICINA_DUPLICADA'
      };
    }
    
    return { 
      exito: false, 
      error: 'Error del servidor al crear medicina',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Actualizar medicina
 */
export const actualizarMedicina = async (medicinaId, usuarioId, medicina) => {
  let client;
  
  try {
    console.log('✏️ [MEDICINAS] Actualizando medicina ID:', medicinaId);
    
    client = await pool.connect();
    
    // Verificar que la medicina existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT m.id, m.adulto_mayor_id
      FROM medicinas m
      WHERE m.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [medicinaId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Medicina no encontrada',
        codigo: 'MEDICINA_NO_ENCONTRADA'
      };
    }
    
    const adultoId = verifyResult.rows[0].adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para modificar esta medicina',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const camposPermitidos = [
      'nombre', 'dosis', 'frecuencia', 'horarios', 'duracion_dias',
      'proposito', 'instrucciones', 'stock_actual', 'stock_minimo',
      'fecha_inicio', 'fecha_fin', 'dias_semana', 'activa'
    ];
    
    for (const campo of camposPermitidos) {
      if (medicina[campo] !== undefined) {
        updates.push(`${campo} = $${paramIndex}`);
        values.push(medicina[campo]);
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
    
    values.push(medicinaId);
    
    const query = `
      UPDATE medicinas 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    const medicinaActualizada = result.rows[0];
    
    console.log('✅ Medicina actualizada exitosamente');
    
    return {
      exito: true,
      medicina: medicinaActualizada,
      mensaje: 'Medicina actualizada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarMedicina:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar medicina',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Eliminar medicina (borrado lógico)
 */
export const eliminarMedicina = async (medicinaId, usuarioId) => {
  let client;
  
  try {
    console.log('🗑️ [MEDICINAS] Eliminando medicina ID:', medicinaId);
    
    client = await pool.connect();
    
    // Verificar que la medicina existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT m.id, m.adulto_mayor_id
      FROM medicinas m
      WHERE m.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [medicinaId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Medicina no encontrada',
        codigo: 'MEDICINA_NO_ENCONTRADA'
      };
    }
    
    const adultoId = verifyResult.rows[0].adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para eliminar esta medicina',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Borrado lógico
    const deleteQuery = `
      UPDATE medicinas 
      SET activa = false, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [medicinaId]);
    
    console.log('✅ Medicina eliminada exitosamente');
    
    return {
      exito: true,
      mensaje: 'Medicina eliminada correctamente',
      id: result.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error en eliminarMedicina:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al eliminar medicina',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Marcar medicina como tomada
 */
export const marcarMedicinaTomada = async (medicinaId, usuarioId, datos) => {
  let client;
  
  try {
    console.log('✅ [MEDICINAS] Marcando medicina como tomada, ID:', medicinaId);
    
    const { fecha_toma, horario, observaciones } = datos;
    
    client = await pool.connect();
    
    // Verificar que la medicina existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT m.id, m.adulto_mayor_id, m.nombre
      FROM medicinas m
      WHERE m.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [medicinaId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Medicina no encontrada',
        codigo: 'MEDICINA_NO_ENCONTRADA'
      };
    }
    
    const medicina = verifyResult.rows[0];
    const adultoId = medicina.adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes acceso a esta medicina',
        codigo: 'SIN_ACCESO'
      };
    }
    
    const fechaToma = fecha_toma || new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe registro para hoy en este horario
    const checkQuery = `
      SELECT id FROM registros_medicina 
      WHERE medicina_id = $1 
        AND fecha_toma = $2 
        AND horario = $3
    `;
    
    const checkResult = await client.query(checkQuery, [
      medicinaId,
      fechaToma,
      horario
    ]);
    
    let resultado;
    
    if (checkResult.rows.length > 0) {
      // Actualizar registro existente
      const updateQuery = `
        UPDATE registros_medicina 
        SET completada = true, 
            observaciones = $1,
            usuario_registro_id = $2,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        observaciones || null,
        usuarioId,
        checkResult.rows[0].id
      ]);
      
      resultado = updateResult.rows[0];
    } else {
      // Insertar nuevo registro
      const insertQuery = `
        INSERT INTO registros_medicina (
          medicina_id,
          usuario_registro_id,
          adulto_mayor_id,
          fecha_toma,
          horario,
          completada,
          observaciones
        ) VALUES ($1, $2, $3, $4, $5, true, $6)
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        medicinaId,
        usuarioId,
        adultoId,
        fechaToma,
        horario,
        observaciones || null
      ]);
      
      resultado = insertResult.rows[0];
    }
    
    // Reducir stock si es necesario
    if (resultado.completada) {
      await reducirStockMedicina(medicinaId, 1);
    }
    
    console.log('✅ Medicina marcada como tomada:', medicina.nombre);
    
    return {
      exito: true,
      registro: resultado,
      mensaje: 'Medicina marcada como tomada'
    };
    
  } catch (error) {
    console.error('❌ Error en marcarMedicinaTomada:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al marcar medicina como tomada',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 8. Obtener registros de medicinas
 */
export const obtenerRegistrosMedicina = async (usuarioId, fechaInicio = null, fechaFin = null) => {
  let client;
  
  try {
    console.log('📋 [MEDICINAS] Obteniendo registros de medicinas para usuario ID:', usuarioId);
    
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
        registros: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    const fechaInicioConsulta = fechaInicio || new Date();
    fechaInicioConsulta.setDate(fechaInicioConsulta.getDate() - 7); // Últimos 7 días por defecto
    
    const fechaFinConsulta = fechaFin || new Date();
    
    const query = `
      SELECT 
        rm.id,
        rm.medicina_id,
        m.nombre as medicina_nombre,
        m.dosis,
        rm.fecha_toma,
        rm.horario,
        rm.completada,
        rm.observaciones,
        rm.creado_en,
        u.nombre as usuario_nombre
      FROM registros_medicina rm
      INNER JOIN medicinas m ON rm.medicina_id = m.id
      LEFT JOIN usuarios u ON rm.usuario_registro_id = u.id
      WHERE rm.adulto_mayor_id = $1
        AND rm.fecha_toma BETWEEN $2 AND $3
      ORDER BY rm.fecha_toma DESC, 
        CASE 
          WHEN rm.horario = 'manana' THEN 1
          WHEN rm.horario = 'mediodia' THEN 2
          WHEN rm.horario = 'tarde' THEN 3
          WHEN rm.horario = 'noche' THEN 4
          ELSE 5
        END
    `;
    
    const result = await client.query(query, [
      adulto_mayor_id,
      fechaInicioConsulta.toISOString().split('T')[0],
      fechaFinConsulta.toISOString().split('T')[0]
    ]);
    
    console.log(`✅ Encontrados ${result.rows.length} registros de medicinas`);
    
    return {
      exito: true,
      registros: result.rows,
      periodo: {
        inicio: fechaInicioConsulta.toISOString().split('T')[0],
        fin: fechaFinConsulta.toISOString().split('T')[0]
      },
      adulto_mayor_id
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerRegistrosMedicina:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener registros de medicinas',
      codigo: 'ERROR_SERVIDOR',
      registros: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Obtener medicinas por tipo de frecuencia
 */
export const obtenerMedicinasPorFrecuencia = async (usuarioId, frecuencia) => {
  let client;
  
  try {
    console.log('📊 [MEDICINAS] Obteniendo medicinas por frecuencia:', frecuencia);
    
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
        medicinas: [],
        frecuencia,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    const query = `
      SELECT 
        id,
        nombre,
        dosis,
        frecuencia,
        horarios,
        proposito,
        stock_actual,
        stock_minimo
      FROM medicinas 
      WHERE adulto_mayor_id = $1
        AND frecuencia = $2
        AND activa = true
      ORDER BY nombre
    `;
    
    const result = await client.query(query, [adulto_mayor_id, frecuencia]);
    
    const medicinas = result.rows.map(med => ({
      ...med,
      horarios: med.horarios || []
    }));
    
    console.log(`✅ Encontradas ${medicinas.length} medicinas con frecuencia "${frecuencia}"`);
    
    return {
      exito: true,
      frecuencia,
      medicinas,
      adulto_mayor_id,
      total: medicinas.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinasPorFrecuencia:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicinas por frecuencia',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 10. Obtener estadísticas de medicinas
 */
export const obtenerEstadisticasMedicinas = async (usuarioId) => {
  let client;
  
  try {
    console.log('📈 [MEDICINAS] Obteniendo estadísticas de medicinas para usuario ID:', usuarioId);
    
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
        estadisticas: {},
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    const hoy = new Date().toISOString().split('T')[0];
    
    // Obtener estadísticas
    const query = `
      SELECT 
        -- Total de medicinas
        COUNT(*) as total_medicinas,
        
        -- Por frecuencia
        COUNT(CASE WHEN frecuencia = 'diaria' THEN 1 END) as medicinas_diarias,
        COUNT(CASE WHEN frecuencia = 'semanal' THEN 1 END) as medicinas_semanales,
        COUNT(CASE WHEN frecuencia = 'mensual' THEN 1 END) as medicinas_mensuales,
        COUNT(CASE WHEN frecuencia = 'ocasional' THEN 1 END) as medicinas_ocasionales,
        
        -- Por horario
        COUNT(CASE WHEN 'manana' = ANY(horarios) THEN 1 END) as medicinas_manana,
        COUNT(CASE WHEN 'mediodia' = ANY(horarios) THEN 1 END) as medicinas_mediodia,
        COUNT(CASE WHEN 'tarde' = ANY(horarios) THEN 1 END) as medicinas_tarde,
        COUNT(CASE WHEN 'noche' = ANY(horarios) THEN 1 END) as medicinas_noche,
        
        -- Stock
        COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as medicinas_bajo_stock,
        COUNT(CASE WHEN stock_actual = 0 THEN 1 END) as medicinas_sin_stock,
        
        -- Cumplimiento hoy
        COALESCE((
          SELECT COUNT(DISTINCT rm.medicina_id)
          FROM registros_medicina rm
          WHERE rm.adulto_mayor_id = $1
            AND rm.fecha_toma = $2
            AND rm.completada = true
        ), 0) as medicinas_tomadas_hoy
        
      FROM medicinas
      WHERE adulto_mayor_id = $1
        AND activa = true
    `;
    
    const result = await client.query(query, [adulto_mayor_id, hoy]);
    
    const estadisticas = result.rows[0];
    
    // Calcular porcentaje de cumplimiento hoy
    const totalMedicinasHoy = estadisticas.medicinas_diarias;
    if (totalMedicinasHoy > 0) {
      estadisticas.porcentaje_cumplimiento_hoy = Math.round(
        (estadisticas.medicinas_tomadas_hoy / totalMedicinasHoy) * 100
      );
    } else {
      estadisticas.porcentaje_cumplimiento_hoy = 0;
    }
    
    console.log('✅ Estadísticas de medicinas obtenidas');
    
    return {
      exito: true,
      estadisticas: {
        ...estadisticas,
        fecha_consulta: hoy,
        adulto_mayor_id
      }
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasMedicinas:', error.message);
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
 * 11. Actualizar stock de medicina
 */
export const actualizarStockMedicina = async (medicinaId, usuarioId, nuevoStock) => {
  let client;
  
  try {
    console.log('📦 [MEDICINAS] Actualizando stock de medicina ID:', medicinaId);
    
    client = await pool.connect();
    
    // Verificar que la medicina existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT m.id, m.adulto_mayor_id, m.nombre, m.stock_actual
      FROM medicinas m
      WHERE m.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [medicinaId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Medicina no encontrada',
        codigo: 'MEDICINA_NO_ENCONTRADA'
      };
    }
    
    const medicina = verifyResult.rows[0];
    const adultoId = medicina.adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para actualizar esta medicina',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Actualizar stock
    const updateQuery = `
      UPDATE medicinas 
      SET stock_actual = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [nuevoStock, medicinaId]);
    
    const medicinaActualizada = result.rows[0];
    
    // Registrar movimiento de stock
    await registrarMovimientoStock({
      medicina_id: medicinaId,
      usuario_id: usuarioId,
      adulto_mayor_id: adultoId,
      tipo: 'ajuste',
      cantidad_anterior: medicina.stock_actual,
      cantidad_nueva: nuevoStock,
      observaciones: 'Ajuste manual de stock'
    });
    
    console.log(`✅ Stock actualizado: ${medicina.nombre} - ${medicina.stock_actual} → ${nuevoStock}`);
    
    return {
      exito: true,
      medicina: medicinaActualizada,
      movimiento: {
        anterior: medicina.stock_actual,
        nuevo: nuevoStock,
        diferencia: nuevoStock - medicina.stock_actual
      },
      mensaje: 'Stock actualizado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarStockMedicina:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar stock',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 12. Obtener medicinas con stock bajo
 */
export const obtenerMedicinasStockBajo = async (usuarioId) => {
  let client;
  
  try {
    console.log('⚠️ [MEDICINAS] Obteniendo medicinas con stock bajo para usuario ID:', usuarioId);
    
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
        medicinas: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    const query = `
      SELECT 
        id,
        nombre,
        dosis,
        frecuencia,
        stock_actual,
        stock_minimo,
        ROUND((stock_actual::DECIMAL / stock_minimo) * 100) as porcentaje_stock,
        CASE 
          WHEN stock_actual <= 0 THEN 'agotado'
          WHEN stock_actual <= stock_minimo THEN 'bajo'
          ELSE 'normal'
        END as estado_stock
      FROM medicinas
      WHERE adulto_mayor_id = $1
        AND activa = true
        AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC, porcentaje_stock ASC
    `;
    
    const result = await client.query(query, [adulto_mayor_id]);
    
    console.log(`✅ Encontradas ${result.rows.length} medicinas con stock bajo`);
    
    return {
      exito: true,
      medicinas: result.rows,
      adulto_mayor_id,
      total: result.rows.length,
      alertas: result.rows.filter(m => m.stock_actual <= 0).length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinasStockBajo:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicinas con stock bajo',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 13. Buscar medicinas
 */
export const buscarMedicinas = async (usuarioId, busqueda) => {
  let client;
  
  try {
    console.log('🔍 [MEDICINAS] Buscando medicinas:', busqueda);
    
    if (!busqueda || busqueda.trim().length < 2) {
      return {
        exito: true,
        medicinas: [],
        busqueda,
        mensaje: 'Término de búsqueda muy corto'
      };
    }
    
    const termino = `%${busqueda.trim()}%`;
    
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
        medicinas: [],
        busqueda,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    const query = `
      SELECT 
        id,
        nombre,
        dosis,
        frecuencia,
        horarios,
        proposito,
        stock_actual,
        stock_minimo
      FROM medicinas
      WHERE adulto_mayor_id = $1
        AND activa = true
        AND (
          LOWER(nombre) LIKE LOWER($2)
          OR LOWER(dosis) LIKE LOWER($2)
          OR LOWER(proposito) LIKE LOWER($2)
          OR LOWER(instrucciones) LIKE LOWER($2)
        )
      ORDER BY 
        CASE 
          WHEN LOWER(nombre) LIKE LOWER($2) THEN 1
          WHEN LOWER(dosis) LIKE LOWER($2) THEN 2
          ELSE 3
        END,
        nombre
      LIMIT 20
    `;
    
    const result = await client.query(query, [adulto_mayor_id, termino]);
    
    const medicinas = result.rows.map(med => ({
      ...med,
      horarios: med.horarios || []
    }));
    
    console.log(`✅ Encontradas ${medicinas.length} medicinas para "${busqueda}"`);
    
    return {
      exito: true,
      medicinas,
      busqueda,
      total: medicinas.length
    };
    
  } catch (error) {
    console.error('❌ Error en buscarMedicinas:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al buscar medicinas',
      codigo: 'ERROR_SERVIDOR',
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 14. Obtener medicamentos predefinidos
 */
export const obtenerMedicamentosPredefinidos = async () => {
  try {
    console.log('📦 [MEDICINAS] Obteniendo medicamentos predefinidos');
    
    // Medicamentos predefinidos comunes para adultos mayores
    const medicamentosPredefinidos = [
      {
        id: 'paracetamol',
        nombre: 'Paracetamol',
        dosis_tipica: '500mg',
        proposito: 'Dolor y fiebre',
        categoria: 'analgesico'
      },
      {
        id: 'aspirina',
        nombre: 'Aspirina',
        dosis_tipica: '100mg',
        proposito: 'Prevención cardiovascular',
        categoria: 'antiagregante'
      },
      {
        id: 'enalapril',
        nombre: 'Enalapril',
        dosis_tipica: '10mg',
        proposito: 'Hipertensión arterial',
        categoria: 'antihipertensivo'
      },
      {
        id: 'atorvastatina',
        nombre: 'Atorvastatina',
        dosis_tipica: '20mg',
        proposito: 'Colesterol alto',
        categoria: 'hipolipemiante'
      },
      {
        id: 'metformina',
        nombre: 'Metformina',
        dosis_tipica: '850mg',
        proposito: 'Diabetes tipo 2',
        categoria: 'antidiabetico'
      },
      {
        id: 'omeprazol',
        nombre: 'Omeprazol',
        dosis_tipica: '20mg',
        proposito: 'Acidez estomacal',
        categoria: 'protector_gastrico'
      },
      {
        id: 'loratadina',
        nombre: 'Loratadina',
        dosis_tipica: '10mg',
        proposito: 'Alergias',
        categoria: 'antihistaminico'
      },
      {
        id: 'clonazepam',
        nombre: 'Clonazepam',
        dosis_tipica: '0.5mg',
        proposito: 'Ansiedad, insomnio',
        categoria: 'ansiolitico',
        advertencia: 'Uso controlado'
      }
    ];
    
    return {
      exito: true,
      medicamentos: medicamentosPredefinidos
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicamentosPredefinidos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener medicamentos predefinidos',
      codigo: 'ERROR_SERVIDOR',
      medicamentos: []
    };
  }
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * 15. Reducir stock de medicina (función auxiliar)
 */
const reducirStockMedicina = async (medicinaId, cantidad) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      UPDATE medicinas 
      SET stock_actual = GREATEST(0, stock_actual - $1), 
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING stock_actual
    `;
    
    const result = await client.query(query, [cantidad, medicinaId]);
    
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error en reducirStockMedicina:', error.message);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 16. Registrar movimiento de stock (función auxiliar)
 */
const registrarMovimientoStock = async (movimiento) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      INSERT INTO movimientos_stock_medicina (
        medicina_id,
        usuario_id,
        adulto_mayor_id,
        tipo,
        cantidad_anterior,
        cantidad_nueva,
        observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await client.query(query, [
      movimiento.medicina_id,
      movimiento.usuario_id,
      movimiento.adulto_mayor_id,
      movimiento.tipo,
      movimiento.cantidad_anterior,
      movimiento.cantidad_nueva,
      movimiento.observaciones
    ]);
    
  } catch (error) {
    console.error('❌ Error en registrarMovimientoStock:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== EXPORTACIÓN ====================

export default {
  // Medicinas CRUD
  obtenerTodasMedicinas,
  crearMedicina,
  actualizarMedicina,
  eliminarMedicina,
  
  // Consultas específicas
  obtenerMedicinasHoy,
  obtenerMedicinasFrecuentes,
  obtenerMedicinasPorFrecuencia,
  obtenerMedicinasStockBajo,
  buscarMedicinas,
  
  // Registros y seguimiento
  marcarMedicinaTomada,
  obtenerRegistrosMedicina,
  
  // Gestión de stock
  actualizarStockMedicina,
  
  // Estadísticas y reportes
  obtenerEstadisticasMedicinas,
  
  // Utilidades
  obtenerMedicamentosPredefinidos
};