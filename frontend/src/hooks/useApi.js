import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

// Consulta (GET) a la API propia con sus estados: 'cargando', 'listo' o 'error'.
// Se vuelve a pedir cuando cambian la ruta o los parámetros, o al llamar a recargar().
// Si ruta es null no se pide nada (por ejemplo, mientras falta un dato).
// Con { mantenerAnteriores: true }, al cambiar los parámetros se siguen mostrando los datos de la consulta
// anterior hasta que lleguen los nuevos (útil en paneles con filtros: no parpadea ni salta el diseño).
export function useApi(ruta, consulta, { mantenerAnteriores = false } = {}) {
  const [intento, setIntento] = useState(0)
  const [respuesta, setRespuesta] = useState(null)

  // La ruta y los parámetros se juntan en un texto: si no cambia, no se repite la petición
  const clave = ruta === null ? null : JSON.stringify([ruta, consulta ?? {}])

  useEffect(() => {
    if (clave === null) return
    const [rutaPedida, parametros] = JSON.parse(clave)
    const controlador = new AbortController()
    api
      .obtener(rutaPedida, parametros, controlador.signal)
      .then((datos) => setRespuesta({ clave, intento, datos, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return // cambió la consulta o se salió de la página
        setRespuesta({ clave, intento, datos: null, error })
      })
    return () => controlador.abort()
  }, [clave, intento])

  const llego = clave !== null && respuesta?.clave === clave && respuesta?.intento === intento
  // mientras se recarga se siguen mostrando los datos anteriores de la misma consulta (no parpadea)
  const anteriores = respuesta?.clave === clave || mantenerAnteriores ? (respuesta?.datos ?? null) : null
  let estado = 'cargando'
  if (llego) estado = respuesta.error ? 'error' : 'listo'

  return {
    estado,
    datos: llego ? respuesta.datos : anteriores,
    error: estado === 'error' ? respuesta.error : null,
    recargar: () => setIntento((n) => n + 1),
  }
}
