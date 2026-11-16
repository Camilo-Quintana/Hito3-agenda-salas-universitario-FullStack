import { NavLink, Outlet } from 'react-router-dom'

const SECCIONES = [
  { ruta: '/admin', texto: 'Indicadores', icono: 'bi-bar-chart', fin: true },
  { ruta: '/admin/solicitudes', texto: 'Solicitudes y reservas', icono: 'bi-inbox' },
  { ruta: '/admin/espacios', texto: 'Espacios', icono: 'bi-door-open' },
  { ruta: '/admin/edificios', texto: 'Edificios y equipamiento', icono: 'bi-buildings' },
  { ruta: '/admin/actividad', texto: 'Actividad', icono: 'bi-activity' },
]

// Marco común de las páginas de administración: título y pestañas de navegación
function AdminLayout() {
  return (
    <section aria-labelledby="titulo-admin">
      <h1 id="titulo-admin" className="titulo-pagina">
        Administración
      </h1>
      <nav aria-label="Secciones de administración">
        <ul className="nav nav-pills admin-secciones my-3 pb-1">
          {SECCIONES.map((seccion) => (
            <li key={seccion.ruta} className="nav-item">
              <NavLink to={seccion.ruta} end={seccion.fin} className={({ isActive }) => `nav-link text-nowrap ${isActive ? 'active' : ''}`}>
                <i className={`bi ${seccion.icono} me-1`} aria-hidden="true"></i>
                {seccion.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </section>
  )
}

export default AdminLayout
