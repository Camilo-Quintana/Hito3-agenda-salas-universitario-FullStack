// Exporta el ranking de espacios a un archivo CSV (se arma en el navegador con los datos que ya llegaron).
// Formato pensado para abrirlo con Excel en español (Chile): separador ";", decimales con coma y
// marca BOM al inicio para que respete las tildes.
import { bandaDe } from './bandas.js'

const SEPARADOR = ';'

function celda(valor) {
  const texto = String(valor ?? '')
  // entre comillas si trae separador, comillas o saltos de línea
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

function decimal(valor) {
  return String(valor).replace('.', ',')
}

export function rankingACsv(ranking) {
  const encabezado = ['Posición', 'Espacio', 'Tipo', 'Edificio', 'Reservas (lunes a viernes)', 'Ocupación (%)', 'Banda']
  const filas = ranking.map((f) => [
    f.posicion,
    f.nombre,
    f.tipo,
    f.edificio,
    f.reservasHabiles,
    decimal(f.ocupacion),
    bandaDe(f.ocupacion).nombre,
  ])
  return [encabezado, ...filas].map((fila) => fila.map(celda).join(SEPARADOR)).join('\r\n')
}

export function descargarRankingCsv(ranking, periodo) {
  const contenido = '﻿' + rankingACsv(ranking)
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `ocupacion-espacios_${periodo.desde}_a_${periodo.hasta}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // se libera después de que el navegador alcanzó a iniciar la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
