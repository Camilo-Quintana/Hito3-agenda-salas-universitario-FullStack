import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import EspaciosPage from './pages/EspaciosPage.jsx'
import DetalleEspacioPage from './pages/DetalleEspacioPage.jsx'
import MisReservasPage from './pages/MisReservasPage.jsx'
import PerfilPage from './pages/PerfilPage.jsx'
import IngresarPage from './pages/IngresarPage.jsx'
import RegistroPage from './pages/RegistroPage.jsx'
import NoEncontradoPage from './pages/NoEncontradoPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import PanelPage from './pages/admin/PanelPage.jsx'
import SolicitudesPage from './pages/admin/SolicitudesPage.jsx'
import EspaciosAdminPage from './pages/admin/EspaciosAdminPage.jsx'
import EdificiosAdminPage from './pages/admin/EdificiosAdminPage.jsx'
import ActividadPage from './pages/admin/ActividadPage.jsx'

// Solo rutas y estructura. Los datos los pide cada página a la API (hook useApi)
// y la sesión la comparte el contexto de ProveedorSesion (main.jsx).
function App() {
  const { pathname } = useLocation()

  // Cada vez que cambia la ruta, volvemos al inicio de la página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <Navbar />
      <main className="app-contenido container">
        <Routes>
          <Route path="/" element={<EspaciosPage />} />
          <Route path="/espacios/:id" element={<DetalleEspacioPage />} />
          <Route path="/ingresar" element={<IngresarPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route
            path="/mis-reservas"
            element={
              <RutaProtegida>
                <MisReservasPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil"
            element={
              <RutaProtegida>
                <PerfilPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin"
            element={
              <RutaProtegida soloAdmin>
                <AdminLayout />
              </RutaProtegida>
            }
          >
            <Route index element={<PanelPage />} />
            <Route path="solicitudes" element={<SolicitudesPage />} />
            <Route path="espacios" element={<EspaciosAdminPage />} />
            <Route path="edificios" element={<EdificiosAdminPage />} />
            <Route path="actividad" element={<ActividadPage />} />
          </Route>
          <Route path="*" element={<NoEncontradoPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
