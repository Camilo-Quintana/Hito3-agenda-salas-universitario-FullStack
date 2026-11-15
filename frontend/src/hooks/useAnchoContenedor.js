import { useEffect, useRef, useState } from 'react'

// Mide el ancho de un elemento y lo actualiza cuando cambia el tamaño de la ventana.
// Los gráficos SVG se dibujan con el ancho real: así el texto no se estira ni se achica.
export function useAnchoContenedor(anchoInicial = 600) {
  const ref = useRef(null)
  const [ancho, setAncho] = useState(anchoInicial)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => {
      setAncho(Math.max(240, Math.floor(entrada.contentRect.width)))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return [ref, ancho]
}
