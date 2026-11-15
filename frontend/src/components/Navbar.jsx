import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '../assets/images/logo.png'
import { useSesion } from '../context/sesion.js'
import './Navbar.css'

// Barra de arriba. Los enlaces cambian según la sesión y el rol. En celular el menú se abre con un botón.
function Navbar() {
  const { usuario, salir } = useSesion()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  const enlaces = [{ ruta: '/', texto: 'Espacios', icono: 'bi-grid' }]
  if (usuario) enlaces.push({ ruta: '/mis-reservas', texto: 'Mis reservas', icono: 'bi-bookmark-check' })
  if (usuario) enlaces.push({ ruta: '/perfil', texto: 'Mi perfil', icono: 'bi-person-circle' })
  else enlaces.push({ ruta: '/ingresar', texto: 'Ingresar', icono: 'bi-box-arrow-in-right' })

  // Si estaba en una página protegida, RutaProtegida la manda al inicio
  function cerrarSesion() {
    cerrarMenu()
    salir()
  }

  return (
    <header className="navbar-unab">
      <nav className="container navbar-unab__barra" aria-label="Navegación principal">
        <Link to="/" className="navbar-unab__marca" onClick={cerrarMenu}>
          <img src={logo} alt="Universidad Andrés Bello" className="navbar-unab__logo" />
          <span className="navbar-unab__nombre">ReservaUNAB</span>
        </Link>

        <button
          type="button"
          className="navbar-unab__toggle"
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <i className={`bi ${menuAbierto ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true"></i>
        </button>

        <div id="menu-principal" className={`navbar-unab__menu ${menuAbierto ? 'abierto' : ''}`}>
          {usuario && <span className="navbar-unab__saludo">Hola, {usuario.nombre.split(' ')[0]}</span>}
          <ul className="navbar-unab__enlaces">
            {enlaces.map((enlace) => (
              <li key={enlace.ruta}>
                <NavLink
                  to={enlace.ruta}
                  end={enlace.ruta === '/'}
                  className={({ isActive }) => `navbar-unab__enlace ${isActive ? 'activo' : ''}`}
                  onClick={cerrarMenu}
                >
                  <i className={`bi ${enlace.icono} me-1`} aria-hidden="true"></i>
                  {enlace.texto}
                </NavLink>
              </li>
            ))}
            {usuario && (
              <li>
                <button type="button" className="navbar-unab__enlace navbar-unab__salir" onClick={cerrarSesion}>
                  <i className="bi bi-box-arrow-right me-1" aria-hidden="true"></i>
                  Salir
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
