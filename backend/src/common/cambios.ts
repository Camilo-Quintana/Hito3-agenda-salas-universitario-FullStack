/** Compara dos versiones de un objeto y devuelve solo los campos que cambiaron: { capacidad: { antes: 20, despues: 25 } } */
export function detectarCambios<T extends object>(antes: T, despues: Partial<T>): Record<string, { antes: unknown; despues: unknown }> {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {}
  for (const campo of Object.keys(despues) as (keyof T)[]) {
    const valorNuevo = despues[campo]
    if (valorNuevo === undefined) continue
    if (JSON.stringify(antes[campo]) !== JSON.stringify(valorNuevo)) {
      cambios[campo as string] = { antes: antes[campo], despues: valorNuevo }
    }
  }
  return cambios
}
