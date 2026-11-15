import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import CampoTexto from '../components/CampoTexto.jsx'
import Alerta from '../components/Alerta.jsx'
import { useSesion } from '../context/sesion.js'
import { erroresDeApi, validarIngreso } from '../utils/validaciones.js'

function IngresarPage() {
  const { usuario, ingresar } = useSesion()
  const location = useLocation()
  const navigate = useNavigate()
  const [valores, setValores] = useState({ correo: '', password: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  // si ya hay sesión, no tiene sentido mostrar el formulario
  if (usuario) return <Navigate to={location.state?.desde ?? '/'} replace />

  function cambiarCampo(campo, valor) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
    setErrores((anteriores) => ({ ...anteriores, [campo]: null }))
    setError(null)
  }

  async function enviar(evento) {
    evento.preventDefault()
    const encontrados = validarIngreso(valores)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    try {
      await ingresar({ correo: valores.correo.trim().toLowerCase(), password: valores.password })
      navigate(location.state?.desde ?? '/', { replace: true }) // vuelve a donde estaba
    } catch (problema) {
      setError(problema.message)
      setErrores(erroresDeApi(problema))
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-ingresar" className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <h1 id="titulo-ingresar" className="titulo-pagina">
          Ingresar
        </h1>
        <p className="text-muted">Inicia sesión para reservar y revisar tus reservas.</p>

        <form className="panel-blanco" noValidate onSubmit={enviar}>
          <CampoTexto
            id="ingreso-correo"
            etiqueta="Correo institucional"
            tipo="email"
            valor={valores.correo}
            error={errores.correo}
            onCambiar={(valor) => cambiarCampo('correo', valor)}
            autoComplete="email"
          />
          <CampoTexto
            id="ingreso-password"
            etiqueta="Contraseña"
            tipo="password"
            valor={valores.password}
            error={errores.password}
            onCambiar={(valor) => cambiarCampo('password', valor)}
            autoComplete="current-password"
          />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
            Ingresar
          </button>
          <p className="text-center small mt-3 mb-0">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" state={location.state}>
              Crea una aquí
            </Link>
          </p>
        </form>

        <Alerta tipo="info">
          <strong>Cuentas de prueba:</strong>
          <br />
          Estudiante: demo@uandresbello.edu / Demo1234
          <br />
          Administración: admin@uandresbello.edu / Admin1234
        </Alerta>
      </div>
    </section>
  )
}

export default IngresarPage
