import { useState } from 'react'
import CampoTexto from '../components/CampoTexto.jsx'
import Alerta from '../components/Alerta.jsx'
import { useSesion } from '../context/sesion.js'
import { erroresDeApi, validarPerfil } from '../utils/validaciones.js'

const NOMBRE_ROL = { estudiante: 'Estudiante', admin: 'Administración' }

function PerfilPage() {
  const { usuario, actualizarPerfil, salir } = useSesion()
  const [valores, setValores] = useState({ nombre: usuario.nombre, correo: usuario.correo })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function cambiarCampo(campo, valor) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: null })) // el error se borra al corregir
    setMensaje(null)
  }

  async function guardar(evento) {
    evento.preventDefault() // para que el navegador no recargue la página
    const encontrados = validarPerfil(valores)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      const actualizado = await actualizarPerfil({ nombre: valores.nombre.trim(), correo: valores.correo.trim().toLowerCase() })
      setValores({ nombre: actualizado.nombre, correo: actualizado.correo })
      setMensaje({ tipo: 'exito', texto: 'Perfil guardado.' })
    } catch (error) {
      setErrores(erroresDeApi(error))
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-perfil">
      <h1 id="titulo-perfil" className="titulo-pagina">
        Mi perfil
      </h1>
      <p className="text-muted">Tus datos identifican tus reservas en el sistema.</p>

      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <form className="panel-blanco" noValidate onSubmit={guardar}>
            <CampoTexto
              id="perfil-nombre"
              etiqueta="Nombre completo"
              valor={valores.nombre}
              error={errores.nombre}
              onCambiar={(valor) => cambiarCampo('nombre', valor)}
              autoComplete="name"
            />
            <CampoTexto
              id="perfil-correo"
              etiqueta="Correo institucional"
              tipo="email"
              valor={valores.correo}
              error={errores.correo}
              ayuda="Es el correo con el que inicias sesión."
              onCambiar={(valor) => cambiarCampo('correo', valor)}
              autoComplete="email"
            />
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
              Guardar cambios
            </button>
          </form>
        </div>

        <div className="col-12 col-lg-5">
          <section className="panel-blanco" aria-labelledby="titulo-cuenta">
            <h2 id="titulo-cuenta" className="h6">
              Tu cuenta
            </h2>
            <dl className="row small mb-3">
              <dt className="col-4">RUT</dt>
              <dd className="col-8">{usuario.rut}</dd>
              <dt className="col-4">Perfil</dt>
              <dd className="col-8">{NOMBRE_ROL[usuario.rol]}</dd>
            </dl>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={salir}>
              <i className="bi bi-box-arrow-right me-1" aria-hidden="true"></i>
              Cerrar sesión
            </button>
          </section>
        </div>
      </div>
    </section>
  )
}

export default PerfilPage
