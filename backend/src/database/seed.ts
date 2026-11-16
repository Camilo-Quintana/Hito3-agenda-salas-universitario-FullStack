// Inicialización reproducible de las bases de datos:
//   1. Aplica las migraciones pendientes de PostgreSQL.
//   2. Si no hay usuarios, carga los datos de prueba en PostgreSQL y sus eventos en MongoDB.
// Uso: npm run seed          (no hace nada si ya hay datos)
//      npm run seed:reset    (borra todo y vuelve a cargar)
// Docker lo ejecuta antes de iniciar la API (ver "start:prod" en package.json).
import 'reflect-metadata'
import * as bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { DataSource } from 'typeorm'
import { opcionesPostgres } from './data-source'
import { leerEntorno } from '../config/entorno'
import { BLOQUES, aTextoFecha, rangoDeBloque, sumarDias } from '../common/horario'
import { formatearRut } from '../common/rut'
import { Rol, Usuario } from '../usuarios/usuario.entity'
import { Edificio } from '../edificios/edificio.entity'
import { Equipamiento } from '../equipamiento/equipamiento.entity'
import { Espacio, TipoEspacio } from '../espacios/espacio.entity'
import { EspacioEquipamiento } from '../espacios/espacio-equipamiento.entity'
import { EstadoReserva, Reserva } from '../reservas/reserva.entity'
import espaciosJson from './datos/espacios.json'

process.env.TZ ??= 'America/Santiago'

// Números pseudoaleatorios con semilla fija: los datos de prueba salen iguales cada vez
function generador(semilla: number) {
  return () => {
    semilla |= 0
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const azar = generador(2026)
const elegir = <T>(lista: readonly T[]) => lista[Math.floor(azar() * lista.length)]

/** Calcula el dígito verificador para crear RUT ficticios válidos */
function conDigito(cuerpo: number): string {
  const texto = String(cuerpo)
  let suma = 0
  let multiplo = 2
  for (let i = texto.length - 1; i >= 0; i--) {
    suma += Number(texto[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  return formatearRut(`${texto}${resto === 11 ? '0' : resto === 10 ? 'K' : resto}`)
}

const NOMBRES = ['Camila', 'Diego', 'Valentina', 'Matías', 'Javiera', 'Benjamín', 'Antonia', 'Vicente', 'Florencia', 'Tomás', 'Isidora', 'Joaquín', 'Martina', 'Agustín', 'Catalina', 'Lucas', 'Fernanda', 'Nicolás', 'Constanza', 'Sebastián', 'Josefa', 'Cristóbal', 'Trinidad', 'Maximiliano', 'Emilia']
const APELLIDOS = ['Rojas', 'Muñoz', 'Soto', 'Pérez', 'González', 'Díaz', 'Contreras', 'Silva', 'Morales', 'Fuentes', 'Araya', 'Castillo', 'Espinoza', 'Reyes', 'Torres', 'Vargas']
const MOTIVOS: Record<string, string[]> = {
  Clases: ['Ayudantía de Cálculo', 'Repaso para la solemne', 'Ensayo de presentación', 'Tutoría de Programación'],
  Laboratorio: ['Práctica de laboratorio', 'Proyecto de título', 'Experimento del curso', 'Trabajo con el software del ramo'],
  Reunión: ['Reunión de grupo de proyecto', 'Reunión del centro de estudiantes', 'Entrevista para práctica'],
  Estudio: ['Estudio para la prueba', 'Trabajo en grupo', 'Preparación de informe'],
  Exterior: ['Actividad recreativa', 'Ensayo de la tuna', 'Feria de carreras'],
}
// Peso de cada bloque: más demanda a media mañana y a primera hora de la tarde
const PESO_BLOQUE = [2, 4, 6, 6, 5, 3, 5, 6, 5, 4, 3, 2, 1]
function bloqueAlAzar(): string {
  const total = PESO_BLOQUE.reduce((a, b) => a + b, 0)
  let r = azar() * total
  for (let i = 0; i < BLOQUES.length; i++) {
    r -= PESO_BLOQUE[i]
    if (r <= 0) return BLOQUES[i]
  }
  return BLOQUES[BLOQUES.length - 1]
}

async function cargarDatos(ds: DataSource, eventos: mongoose.mongo.Collection) {
  const ahora = new Date()
  const hoy = aTextoFecha(ahora)
  const passwordDemo = await bcrypt.hash('Demo1234', 10)

  // ---------- Usuarios ----------
  const usuarios = ds.getRepository(Usuario)
  const admin = await usuarios.save(
    usuarios.create({ rut: '11.111.111-1', nombre: 'Administración Sede Viña', correo: 'admin@uandresbello.edu', passwordHash: await bcrypt.hash('Admin1234', 10), rol: Rol.ADMIN }),
  )
  const demo = await usuarios.save(
    usuarios.create({ rut: '12.345.678-5', nombre: 'Estudiante Demo', correo: 'demo@uandresbello.edu', passwordHash: passwordDemo }),
  )
  // Los cuatro estudiantes de las reservas de ejemplo del Taller 2, más otros ficticios
  const fijos = [
    { rut: '20.123.456-5', nombre: 'Camila Rojas', correo: 'c.rojas@uandresbello.edu' },
    { rut: '19.876.543-0', nombre: 'Diego Muñoz', correo: 'd.munoz@uandresbello.edu' },
    { rut: '21.345.678-4', nombre: 'Valentina Soto', correo: 'v.soto@uandresbello.edu' },
    { rut: '18.765.432-7', nombre: 'Matías Pérez', correo: 'm.perez@uandresbello.edu' },
  ]
  const otros = Array.from({ length: 26 }, (_, i) => {
    const nombre = `${NOMBRES[(i + 4) % NOMBRES.length]} ${APELLIDOS[(i * 7) % APELLIDOS.length]}`
    const correo = `${nombre.split(' ')[0][0]}.${APELLIDOS[(i * 7) % APELLIDOS.length]}${i + 1}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    return { rut: conDigito(19_000_000 + i * 104_729), nombre, correo: `${correo}@uandresbello.edu` }
  })
  const estudiantes = await usuarios.save([...fijos, ...otros].map((u) => usuarios.create({ ...u, passwordHash: passwordDemo })))

  // ---------- Edificios ----------
  const edificios = await ds.getRepository(Edificio).save([
    { codigo: 'A', nombre: 'Edificio A - Aulas y laboratorios', ubicacion: 'Quillota 980, Viña del Mar', pisos: 3 },
    { codigo: 'B', nombre: 'Edificio B - Ingeniería', ubicacion: 'Quillota 980, Viña del Mar', pisos: 3 },
    { codigo: 'C', nombre: 'Edificio C - Ciencias', ubicacion: 'Los Fresnos 52, Viña del Mar', pisos: 3 },
  ])
  const edificioPorCodigo = new Map(edificios.map((e) => [e.codigo, e]))

  // ---------- Equipamiento (las "características" del Taller 2) ----------
  const nombresEquipos = [...new Set(espaciosJson.flatMap((e) => e.caracteristicas))].sort()
  const equipos = await ds.getRepository(Equipamiento).save(nombresEquipos.map((nombre) => ({ nombre })))
  const equipoPorNombre = new Map(equipos.map((e) => [e.nombre, e]))

  // ---------- Espacios ----------
  // Laboratorios y espacios exteriores requieren aprobación: tienen equipos delicados o se usan para eventos
  const repoEspacios = ds.getRepository(Espacio)
  const espacios: Espacio[] = []
  for (const datos of [...espaciosJson].sort((a, b) => a.id - b.id)) {
    const tipo = datos.tipo as TipoEspacio
    const espacio = await repoEspacios.save(
      repoEspacios.create({
        nombre: datos.nombre,
        tipo,
        categoria: (datos as { categoria?: string }).categoria ?? null,
        piso: datos.piso,
        capacidad: datos.capacidad,
        requiereAprobacion: tipo === TipoEspacio.LABORATORIO || tipo === TipoEspacio.EXTERIOR,
        edificio: edificioPorCodigo.get(datos.edificio)!,
      }),
    )
    await ds.getRepository(EspacioEquipamiento).save(
      datos.caracteristicas.map((nombre) => ({
        espacioId: espacio.id,
        equipamientoId: equipoPorNombre.get(nombre)!.id,
        cantidad: nombre === 'Computadoras' ? Math.min(datos.capacidad, 40) : 1,
      })),
    )
    espacio.edificio = edificioPorCodigo.get(datos.edificio)!
    espacios.push(espacio)
  }
  // Los ids nuevos coinciden con los del JSON del Taller 2 porque se insertan en orden 1..24
  const espacioPorId = new Map(espacios.map((e) => [e.id, e]))

  // ---------- Reservas ----------
  const tomados = new Set<string>() // "espacio|fecha|bloque" y "usuario|fecha" para respetar las reglas
  const reservas: Partial<Reserva>[] = []
  const documentos: Record<string, unknown>[] = []

  function agregar(usuario: Usuario, espacio: Espacio, fecha: string, bloque: string, estado: EstadoReserva, observacion: string | null = null) {
    const claveBloque = `${espacio.id}|${fecha}|${bloque}`
    const claveDia = `${usuario.id}|${fecha}`
    const activa = estado === EstadoReserva.PENDIENTE || estado === EstadoReserva.APROBADA
    if (activa && (tomados.has(claveBloque) || tomados.has(claveDia))) return
    if (activa) {
      tomados.add(claveBloque)
      tomados.add(claveDia)
    }
    // La solicitud se creó entre 1 y 3 días antes (o hace un rato, si es para hoy o el futuro)
    const inicio = rangoDeBloque(fecha, bloque).inicio
    let creadaEn = new Date(inicio.getTime() - (1 + Math.floor(azar() * 3)) * 86_400_000 - Math.floor(azar() * 8) * 3_600_000)
    if (creadaEn > ahora) creadaEn = new Date(ahora.getTime() - Math.floor(azar() * 20 + 1) * 3_600_000)
    const revisadaEn = new Date(creadaEn.getTime() + Math.floor(azar() * 5 + 1) * 3_600_000)
    const motivo = elegir(MOTIVOS[espacio.tipo])
    const asistentes = Math.max(1, Math.min(espacio.capacidad, Math.ceil(azar() * espacio.capacidad)))
    const revisada = espacio.requiereAprobacion && estado !== EstadoReserva.PENDIENTE
    reservas.push({
      usuarioId: usuario.id,
      espacioId: espacio.id,
      fecha,
      bloque,
      motivo,
      asistentes,
      estado,
      observacion,
      revisadaPorId: revisada && estado !== EstadoReserva.CANCELADA ? admin.id : null,
      creadaEn,
      actualizadaEn: estado === EstadoReserva.PENDIENTE ? creadaEn : revisadaEn,
    })
    const indice = reservas.length - 1
    // Eventos de MongoDB que habría dejado la API (el id real se completa después de insertar en SQL)
    const actor = (u: Usuario) => ({ id: u.id, nombre: u.nombre, rol: u.rol })
    const estadoAlCrear = espacio.requiereAprobacion ? EstadoReserva.PENDIENTE : EstadoReserva.APROBADA
    documentos.push({
      indice,
      tipo: 'reserva.creada',
      actor: actor(usuario),
      datos: { estado: estadoAlCrear, espacio: { id: espacio.id, nombre: espacio.nombre, edificio: espacio.edificio.codigo }, fecha, bloque, motivo, asistentes, requiereAprobacion: espacio.requiereAprobacion },
      fecha: creadaEn,
    })
    if (espacio.requiereAprobacion && (estado === EstadoReserva.APROBADA || estado === EstadoReserva.RECHAZADA || estado === EstadoReserva.CANCELADA)) {
      const decision = estado === EstadoReserva.RECHAZADA ? EstadoReserva.RECHAZADA : EstadoReserva.APROBADA
      documentos.push({
        indice,
        tipo: decision === EstadoReserva.APROBADA ? 'reserva.aprobada' : 'reserva.rechazada',
        actor: actor(admin),
        datos: { estadoAnterior: EstadoReserva.PENDIENTE, estado: decision, observacion: decision === EstadoReserva.RECHAZADA ? observacion : null },
        fecha: revisadaEn,
      })
    }
    if (estado === EstadoReserva.CANCELADA) {
      documentos.push({
        indice,
        tipo: 'reserva.cancelada',
        actor: actor(usuario),
        datos: { estadoAnterior: EstadoReserva.APROBADA, estado: EstadoReserva.CANCELADA, observacion, porAdministrador: false },
        fecha: new Date(revisadaEn.getTime() + 3_600_000),
      })
    }
  }

  // Historial de las últimas 4 semanas: más demanda en salas de estudio y laboratorios
  const pesoTipo: Record<string, number> = { Estudio: 5, Laboratorio: 4, Clases: 3, Reunión: 3, Exterior: 1 }
  const espaciosPonderados = espacios.flatMap((e) => Array(pesoTipo[e.tipo]).fill(e) as Espacio[])
  const todos = [demo, ...estudiantes]
  for (let d = -28; d <= -1; d++) {
    const fecha = sumarDias(hoy, d)
    const finDeSemana = [0, 6].includes(new Date(`${fecha}T12:00:00`).getDay())
    for (const usuario of todos) {
      if (azar() > (finDeSemana ? 0.15 : 0.75)) continue
      const espacio = elegir(espaciosPonderados)
      let estado = EstadoReserva.APROBADA
      let observacion: string | null = null
      const r = azar()
      if (espacio.requiereAprobacion && r < 0.15) {
        estado = EstadoReserva.RECHAZADA
        observacion = elegir(['El espacio estará en mantención.', 'Bloque reservado para una actividad de la carrera.', 'Falta indicar el profesor responsable.'])
      } else if (r > 0.9) {
        estado = EstadoReserva.CANCELADA
        observacion = elegir(['Se suspendió la actividad.', 'Cambio de horario del grupo.', null as unknown as string])
      }
      agregar(usuario, espacio, fecha, bloqueAlAzar(), estado, observacion)
    }
  }

  // Reservas de ejemplo del Taller 2 (hoy y mañana)
  const ejemplos: [number, number, number, string][] = [
    [0, 1, 0, '10:00-11:00'], [0, 22, 1, '12:00-13:00'], [1, 11, 0, '15:00-16:00'], [1, 13, 1, '09:00-10:00'],
    [2, 22, 0, '18:00-19:00'], [2, 20, 1, '16:00-17:00'], [3, 16, 0, '11:00-12:00'], [3, 23, 1, '17:00-18:00'],
  ]
  for (const [estudiante, espacioId, dia, bloque] of ejemplos) {
    const espacio = espacioPorId.get(espacioId)!
    // Las de espacios con aprobación de mañana quedan pendientes para mostrar el flujo de solicitudes
    const estado = espacio.requiereAprobacion && dia === 1 ? EstadoReserva.PENDIENTE : EstadoReserva.APROBADA
    agregar(estudiantes[estudiante], espacio, sumarDias(hoy, dia), bloque, estado)
  }
  // Próximos días: algunas reservas aprobadas y solicitudes pendientes de laboratorios
  for (let d = 0; d <= 5; d++) {
    const fecha = sumarDias(hoy, d)
    for (const usuario of estudiantes.slice(4)) {
      if (azar() > 0.3) continue
      const espacio = elegir(espaciosPonderados)
      const bloque = bloqueAlAzar()
      if (d === 0 && rangoDeBloque(fecha, bloque).inicio <= ahora) continue
      agregar(usuario, espacio, fecha, bloque, espacio.requiereAprobacion ? EstadoReserva.PENDIENTE : EstadoReserva.APROBADA)
    }
  }
  // La cuenta demo tiene una solicitud pendiente en 2 días para mostrar el flujo completo
  agregar(demo, espacioPorId.get(12)!, sumarDias(hoy, 2), '10:00-11:00', EstadoReserva.PENDIENTE)

  const guardadas = await ds.getRepository(Reserva).save(reservas, { chunk: 200 })
  const ahoraIds = guardadas.map((r) => r.id)
  await eventos.insertMany(
    documentos.map(({ indice, ...doc }) => ({ ...doc, entidad: { tipo: 'reserva', id: ahoraIds[indice as number] } })),
  )
  // Eventos de alta de los usuarios de prueba
  await eventos.insertMany(
    [demo, ...estudiantes].map((u) => ({
      tipo: 'usuario.registrado',
      entidad: { tipo: 'usuario', id: u.id },
      actor: { id: u.id, nombre: u.nombre, rol: u.rol },
      datos: {},
      fecha: new Date(ahora.getTime() - 40 * 86_400_000),
    })),
  )

  console.log(
    `Datos de prueba: ${2 + estudiantes.length} usuarios, ${edificios.length} edificios, ${espacios.length} espacios, ` +
      `${equipos.length} equipos, ${guardadas.length} reservas y ${documentos.length + todos.length} eventos en MongoDB.`,
  )
}

async function principal() {
  const reiniciar = process.argv.includes('--reset')
  const entorno = leerEntorno()
  const ds = new DataSource(opcionesPostgres())

  // Docker puede levantar la API antes de que las bases acepten conexiones: reintentamos unos segundos
  for (let intento = 1; ; intento++) {
    try {
      await ds.initialize()
      await mongoose.connect(entorno.mongoUri, { serverSelectionTimeoutMS: 3000 })
      break
    } catch (error) {
      if (intento >= 15) throw error
      console.log(`Esperando las bases de datos (intento ${intento})...`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  try {
    const aplicadas = await ds.runMigrations()
    if (aplicadas.length) console.log(`Migraciones aplicadas: ${aplicadas.map((m) => m.name).join(', ')}`)

    const eventos = mongoose.connection.collection('eventos')
    if (reiniciar) {
      await ds.query('TRUNCATE reservas, espacio_equipamiento, espacios, equipamiento, edificios, usuarios RESTART IDENTITY CASCADE')
      await eventos.deleteMany({})
      console.log('Bases de datos vaciadas.')
    }
    if ((await ds.getRepository(Usuario).count()) > 0) {
      console.log('La base ya tiene datos: no se cargan datos de prueba (usa npm run seed:reset para reiniciar).')
      return
    }
    await cargarDatos(ds, eventos)
  } finally {
    await ds.destroy()
    await mongoose.disconnect()
  }
}

principal().catch((error) => {
  console.error('No se pudo inicializar la base de datos:', error.message)
  process.exit(1)
})
