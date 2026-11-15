import { useLayoutEffect, useRef, useState } from 'react'

// Mide el ancho de un elemento y lo actualiza cuando cambia de tamaño.
// Los gráficos SVG se dibujan con el ancho real: así el texto no se estira ni se achica.
// La primera medición es inmediata (antes de pintar), para no depender solo del ResizeObserver:
// si este tarda o no llega, el gráfico no queda con el ancho inicial desbordando la página.
export function useAnchoContenedor(anchoInicial = 600) {
  const ref = useRef(null)
  const [ancho, setAncho] = useState(anchoInicial)

  useLayoutEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const medir = (valor) => setAncho(Math.max(240, Math.floor(valor)))
    medir(elemento.getBoundingClientRect().width)
    const observador = new ResizeObserver(([entrada]) => medir(entrada.contentRect.width))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return [ref, ancho]
}
