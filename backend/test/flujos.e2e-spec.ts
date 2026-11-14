// Pruebas de punta a punta: levantan la API completa contra PostgreSQL y MongoDB reales
// (los del .env, con los datos de prueba cargados) y recorren los flujos principales.
// Uso: npm run test:e2e   (las bases deben estar corriendo, por ejemplo con docker compose up postgres mongo)
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module'
import { tuberiaValidacion } from '../src/common/validacion'
import { aTextoFecha, sumarDias } from '../src/common/horario'

process.env.TZ = 'America/Santiago'

describe('ReservaUNAB API (e2e)', () => {
  let app: INestApplication
  let api: ReturnType<typeof request>
  let ds: DataSource
  let tokenDemo: string
  let tokenAdmin: string
  let tokenOtro: string
  let idOtro: number
  const reservasCreadas: number[] = []
  // Días que los datos de prueba dejan libres (el seed llega hasta hoy + 5)
  const hoy = aTextoFecha(new Date())
  const dia6 = sumarDias(hoy, 6)
  const dia7 = sumarDias(hoy, 7)

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = modulo.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(tuberiaValidacion)
    await app.init()
    api = request(app.getHttpServer())
    ds = app.get(DataSource)

    // Si una ejecución anterior quedó a medias, liberamos los días de prueba
    await ds.query(`DELETE FROM reservas WHERE fecha IN ($1, $2)`, [dia6, dia7])

    tokenDemo = (await api.post('/api/auth/login').send({ correo: 'demo@uandresbello.edu', password: 'Demo1234' })).body.token
    tokenAdmin = (await api.post('/api/auth/login').send({ correo: 'admin@uandresbello.edu', password: 'Admin1234' })).body.token

    // Un segundo estudiante, creado con el registro público
    const sufijo = Date.now() % 1_000_000
    const rut = rutValido(30_000_000 + sufijo)
    const registro = await api
      .post('/api/auth/registro')
      .send({ rut, nombre: 'Estudiante Prueba', correo: `prueba${sufijo}@uandresbello.edu`, password: 'Prueba123' })
    expect(registro.status).toBe(201)
    tokenOtro = registro.body.token
    idOtro = registro.body.usuario.id
  })

  afterAll(async () => {
    if (reservasCreadas.length) await ds.query('DELETE FROM reservas WHERE id = ANY($1)', [reservasCreadas])
    if (idOtro) await ds.query('DELETE FROM usuarios WHERE id = $1', [idOtro])
    await app.close()
  })

  describe('autenticación', () => {
    it('rechaza credenciales incorrectas con un mensaje genérico', async () => {
      const r = await api.post('/api/auth/login').send({ correo: 'demo@uandresbello.edu', password: 'otra-clave' })
      expect(r.status).toBe(401)
      expect(r.body.mensaje).toBe('Correo o contraseña incorrectos.')
    })

    it('valida el registro y devuelve los errores por campo', async () => {
      const r = await api.post('/api/auth/registro').send({ rut: '12.345.678-9', nombre: 'A', correo: 'no-es-correo', password: 'corta' })
      expect(r.status).toBe(400)
      expect(Object.keys(r.body.detalles).sort()).toEqual(['correo', 'nombre', 'password', 'rut'])
      expect(r.body.detalles.rut[0]).toMatch(/dígito verificador/)
    })

    it('no deja registrar un RUT repetido', async () => {
      const r = await api
        .post('/api/auth/registro')
        .send({ rut: '12.345.678-5', nombre: 'Otra persona', correo: 'otra@uandresbello.edu', password: 'Clave1234' })
      expect(r.status).toBe(409)
    })

    it('exige token en las rutas protegidas y rol de administrador donde corresponde', async () => {
      expect((await api.get('/api/reservas/mias')).status).toBe(401)
      const r = await api.get('/api/indicadores').set('Authorization', `Bearer ${tokenDemo}`)
      expect(r.status).toBe(403)
    })
  })

  describe('flujo de reserva directa (sala de estudio, sin aprobación)', () => {
    let idReserva: number

    it('crea la reserva aprobada y la guarda en PostgreSQL', async () => {
      const r = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenDemo}`)
        .send({ espacioId: 20, fecha: dia6, bloque: '10:00-11:00', motivo: 'Estudio para la prueba', asistentes: 3 })
      expect(r.status).toBe(201)
      expect(r.body.estado).toBe('aprobada')
      idReserva = r.body.id
      reservasCreadas.push(idReserva)

      const fila = await ds.query('SELECT estado, bloque FROM reservas WHERE id = $1', [idReserva])
      expect(fila[0]).toEqual({ estado: 'aprobada', bloque: '10:00-11:00' })
    })

    it('marca el bloque como ocupado en la disponibilidad', async () => {
      const r = await api.get(`/api/espacios/20/disponibilidad?fecha=${dia6}`)
      expect(r.body.bloques.find((b: { bloque: string }) => b.bloque === '10:00-11:00').estado).toBe('ocupado')
    })

    it('rechaza el mismo bloque para otro estudiante (conflicto de horario)', async () => {
      const r = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenOtro}`)
        .send({ espacioId: 20, fecha: dia6, bloque: '10:00-11:00', motivo: 'Trabajo en grupo', asistentes: 2 })
      expect(r.status).toBe(409)
      expect(r.body.mensaje).toBe('Ese horario ya está ocupado. Elige otro.')
    })

    it('rechaza una segunda reserva el mismo día', async () => {
      const r = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenDemo}`)
        .send({ espacioId: 21, fecha: dia6, bloque: '15:00-16:00', motivo: 'Otra reserva', asistentes: 1 })
      expect(r.status).toBe(409)
      expect(r.body.mensaje).toMatch(/una por día/)
    })

    it('rechaza más asistentes que la capacidad y fechas fuera de rango', async () => {
      const capacidad = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenOtro}`)
        .send({ espacioId: 1, fecha: dia6, bloque: '09:00-10:00', motivo: 'Ayudantía', asistentes: 3 })
      expect(capacidad.status).toBe(400)
      expect(capacidad.body.mensaje).toMatch(/capacidad para 2 personas/)

      const lejos = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenOtro}`)
        .send({ espacioId: 1, fecha: sumarDias(hoy, 30), bloque: '09:00-10:00', motivo: 'Ayudantía', asistentes: 1 })
      expect(lejos.status).toBe(400)
      expect(lejos.body.mensaje).toMatch(/anticipación/)
    })

    it('otro estudiante no puede cancelarla; el dueño sí, y el bloque queda libre', async () => {
      const ajena = await api.patch(`/api/reservas/${idReserva}/cancelar`).set('Authorization', `Bearer ${tokenOtro}`).send({})
      expect(ajena.status).toBe(403)

      const propia = await api
        .patch(`/api/reservas/${idReserva}/cancelar`)
        .set('Authorization', `Bearer ${tokenDemo}`)
        .send({ observacion: 'Se suspendió el estudio' })
      expect(propia.status).toBe(200)
      expect(propia.body.estado).toBe('cancelada')

      const disponibilidad = await api.get(`/api/espacios/20/disponibilidad?fecha=${dia6}`)
      expect(disponibilidad.body.bloques.find((b: { bloque: string }) => b.bloque === '10:00-11:00').estado).toBe('libre')
    })

    it('la reserva cancelada aparece en el historial del estudiante', async () => {
      const r = await api.get('/api/reservas/mias?vista=historial').set('Authorization', `Bearer ${tokenDemo}`)
      expect(r.body.some((x: { id: number; estado: string }) => x.id === idReserva && x.estado === 'cancelada')).toBe(true)
    })
  })

  describe('flujo de solicitud con aprobación (laboratorio)', () => {
    let pendiente: number
    let paraRechazar: number

    it('la reserva de un laboratorio queda pendiente', async () => {
      const r = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenDemo}`)
        .send({ espacioId: 13, fecha: dia7, bloque: '11:00-12:00', motivo: 'Práctica de laboratorio', asistentes: 10 })
      expect(r.status).toBe(201)
      expect(r.body.estado).toBe('pendiente')
      pendiente = r.body.id
      reservasCreadas.push(pendiente)

      const otra = await api
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenOtro}`)
        .send({ espacioId: 14, fecha: dia7, bloque: '11:00-12:00', motivo: 'Proyecto de título', asistentes: 5 })
      paraRechazar = otra.body.id
      reservasCreadas.push(paraRechazar)
    })

    it('un estudiante no puede aprobar', async () => {
      const r = await api.patch(`/api/reservas/${pendiente}/aprobar`).set('Authorization', `Bearer ${tokenDemo}`)
      expect(r.status).toBe(403)
    })

    it('el administrador ve la solicitud y la aprueba una sola vez', async () => {
      const lista = await api.get(`/api/reservas?estado=pendiente&desde=${dia7}&hasta=${dia7}`).set('Authorization', `Bearer ${tokenAdmin}`)
      expect(lista.body.items.map((x: { id: number }) => x.id)).toEqual(expect.arrayContaining([pendiente, paraRechazar]))

      const r = await api.patch(`/api/reservas/${pendiente}/aprobar`).set('Authorization', `Bearer ${tokenAdmin}`)
      expect(r.status).toBe(200)
      expect(r.body.estado).toBe('aprobada')
      expect(r.body.revisadaPor.nombre).toBe('Administración Sede Viña')

      const otraVez = await api.patch(`/api/reservas/${pendiente}/aprobar`).set('Authorization', `Bearer ${tokenAdmin}`)
      expect(otraVez.status).toBe(409)
    })

    it('rechazar exige un motivo', async () => {
      const sinMotivo = await api.patch(`/api/reservas/${paraRechazar}/rechazar`).set('Authorization', `Bearer ${tokenAdmin}`).send({})
      expect(sinMotivo.status).toBe(400)

      const r = await api
        .patch(`/api/reservas/${paraRechazar}/rechazar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ observacion: 'El laboratorio estará en mantención.' })
      expect(r.body.estado).toBe('rechazada')
      expect(r.body.observacion).toBe('El laboratorio estará en mantención.')
    })

    it('el historial de MongoDB muestra la creación y la aprobación en orden', async () => {
      const r = await api.get(`/api/reservas/${pendiente}/historial`).set('Authorization', `Bearer ${tokenDemo}`)
      expect(r.status).toBe(200)
      expect(r.body.map((e: { tipo: string }) => e.tipo)).toEqual(['reserva.creada', 'reserva.aprobada'])
      expect(r.body[1].actor.rol).toBe('admin')
      expect(r.body[0].datos.espacio.nombre).toBe('Laboratorio de Física')
    })

    it('un estudiante no puede ver el historial de una reserva ajena', async () => {
      const r = await api.get(`/api/reservas/${pendiente}/historial`).set('Authorization', `Bearer ${tokenOtro}`)
      expect(r.status).toBe(403)
    })
  })

  describe('administración de edificios, espacios y equipamiento', () => {
    let idEdificio: number
    let idEspacio: number
    let idEquipo: number

    it('crea un edificio, un equipo y un espacio con equipamiento', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` }
      const codigo = `T${Date.now() % 10000}`
      const edificio = await api.post('/api/edificios').set(auth).send({ codigo, nombre: 'Edificio de prueba', pisos: 2 })
      expect(edificio.status).toBe(201)
      idEdificio = edificio.body.id

      const equipo = await api.post('/api/equipamiento').set(auth).send({ nombre: `Equipo prueba ${codigo}` })
      expect(equipo.status).toBe(201)
      idEquipo = equipo.body.id

      const espacio = await api
        .post('/api/espacios')
        .set(auth)
        .send({ nombre: 'Sala de prueba', tipo: 'Clases', edificioId: idEdificio, piso: 2, capacidad: 12, equipamiento: [{ equipamientoId: idEquipo, cantidad: 3 }] })
      expect(espacio.status).toBe(201)
      expect(espacio.body.equipamiento).toEqual([{ id: idEquipo, nombre: `Equipo prueba ${codigo}`, cantidad: 3 }])
      idEspacio = espacio.body.id
    })

    it('valida el piso contra el edificio y los tipos permitidos', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` }
      const piso = await api.post('/api/espacios').set(auth).send({ nombre: 'Sala alta', tipo: 'Clases', edificioId: idEdificio, piso: 5, capacidad: 5 })
      expect(piso.status).toBe(400)
      expect(piso.body.mensaje).toMatch(/piso 5 no existe/)

      const tipo = await api.post('/api/espacios').set(auth).send({ nombre: 'Sala rara', tipo: 'Gimnasio', edificioId: idEdificio, piso: 1, capacidad: 5 })
      expect(tipo.status).toBe(400)
      expect(tipo.body.detalles.tipo[0]).toMatch(/El tipo debe ser uno de/)
    })

    it('actualiza el espacio y registra los cambios en la bitácora', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` }
      const r = await api.patch(`/api/espacios/${idEspacio}`).set(auth).send({ capacidad: 15, requiereAprobacion: true })
      expect(r.body.capacidad).toBe(15)
      const actividad = await api.get('/api/actividad?entidad=espacio&limite=5').set(auth)
      const evento = actividad.body.items.find((e: { tipo: string; entidad: { id: number } }) => e.entidad.id === idEspacio && e.tipo === 'espacio.actualizado')
      expect(evento.datos.cambios.capacidad).toEqual({ antes: 12, despues: 15 })
    })

    it('protege la integridad: no borra edificios con espacios ni equipos en uso', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` }
      expect((await api.delete(`/api/edificios/${idEdificio}`).set(auth)).status).toBe(409)
      expect((await api.delete(`/api/equipamiento/${idEquipo}`).set(auth)).status).toBe(409)
      // en orden correcto sí se puede
      expect((await api.delete(`/api/espacios/${idEspacio}`).set(auth)).status).toBe(204)
      expect((await api.delete(`/api/equipamiento/${idEquipo}`).set(auth)).status).toBe(204)
      expect((await api.delete(`/api/edificios/${idEdificio}`).set(auth)).status).toBe(204)
    })
  })

  describe('indicadores', () => {
    it('calcula la utilización del período', async () => {
      const r = await api.get('/api/indicadores').set('Authorization', `Bearer ${tokenAdmin}`)
      expect(r.status).toBe(200)
      expect(r.body.periodo.dias).toBe(30)
      expect(r.body.totales.reservas).toBeGreaterThan(0)
      expect(r.body.porBloque).toHaveLength(13)
      expect(r.body.movimientoDiario.length).toBeGreaterThan(0)
    })

    it('valida el período', async () => {
      const r = await api.get('/api/indicadores?desde=2026-12-01&hasta=2026-11-01').set('Authorization', `Bearer ${tokenAdmin}`)
      expect(r.status).toBe(400)
    })
  })
})

function rutValido(cuerpo: number): string {
  const texto = String(cuerpo)
  let suma = 0
  let multiplo = 2
  for (let i = texto.length - 1; i >= 0; i--) {
    suma += Number(texto[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  return `${texto}-${resto === 11 ? '0' : resto === 10 ? 'K' : resto}`
}
