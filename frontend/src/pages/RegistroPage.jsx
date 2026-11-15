import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import CampoTexto from '../components/CampoTexto.jsx'
import Alerta from '../components/Alerta.jsx'
import { useSesion } from '../context/sesion.js'
import { erroresDeApi, formatearRut, validarRegistro } from '../utils/validaciones.js'

const VACIO = { nombre: '', correo: '', rut: '', password: '', confirmacion: '' }

function RegistroPage() {
  const { usuario, registrar } = useSesion()
  const location = useLocation()
  const navigate = useNavigate()
  const [valores, setValores] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={location.state?.desde ?? '/'} replace />

  function cambiarCampo(campo, valor) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: null }))
    setError(null)
  }

  async function enviar(evento) {
    evento.preventDefault()
    const encontrados = validarRegistro(valores)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    try {
      await registrar({
        nombre: valores.nombre.trim(),
        correo: valores.correo.trim().toLowerCase(),
        rut: formatearRut(valores.rut),
        password: valores.password,
      })
      navigate(location.state?.desde ?? '/', { replace: true })
    } catch (problema) {
      setError(problema.message)
      setErrores(erroresDeApi(problema))
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-registro" className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h1 id="titulo-registro" className="titulo-pagina">
          Crear cuenta
        </h1>
        <p className="text-muted">Con tu cuenta puedes reservar espacios de la sede y ver tu historial.</p>

        <form className="panel-blanco" noValidate onSubmit={enviar}>
          <CampoTexto
            id="registro-nombre"
            etiqueta="Nombre completo"
            valor={valores.nombre}
            error={errores.nombre}
            onCambiar={(valor) => cambiarCampo('nombre', valor)}
            autoComplete="name"
          />
          <CampoTexto
            id="registro-correo"
            etiqueta="Correo institucional"
            tipo="email"
            valor={valores.correo}
            error={errores.correo}
            ayuda="Ejemplo: nombre@uandresbello.edu"
            onCambiar={(valor) => cambiarCampo('correo', valor)}
            autoComplete="email"
          />
          <CampoTexto
            id="registro-rut"
            etiqueta="RUT"
            valor={valores.rut}
            error={errores.rut}
            ayuda="Con o sin puntos, con guion y dígito verificador. Ejemplo: 12.345.678-5"
            onCambiar={(valor) => cambiarCampo('rut', valor)}
          />
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <CampoTexto
                id="registro-password"
                etiqueta="Contraseña"
                tipo="password"
                valor={valores.password}
                error={errores.password}
                ayuda="Mínimo 8 caracteres, con letras y números."
                onCambiar={(valor) => cambiarCampo('password', valor)}
                autoComplete="new-password"
              />
            </div>
            <div className="col-12 col-md-6">
              <CampoTexto
                id="registro-confirmacion"
                etiqueta="Repite la contraseña"
                tipo="password"
                valor={valores.confirmacion}
                error={errores.confirmacion}
                onCambiar={(valor) => cambiarCampo('confirmacion', valor)}
                autoComplete="new-password"
              />
            </div>
          </div>
          {error && <Alerta tipo="error">{error}</Alerta>}
          <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
            Crear cuenta
          </button>
          <p className="text-center small mt-3 mb-0">
            ¿Ya tienes cuenta?{' '}
            <Link to="/ingresar" state={location.state}>
              Ingresa aquí
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}

export default RegistroPage
