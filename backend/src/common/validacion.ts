import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common'

/** Junta los errores de class-validator por campo: { correo: ['...'], 'equipamiento.0.cantidad': ['...'] } */
function aplanar(errores: ValidationError[], prefijo = ''): Record<string, string[]> {
  const resultado: Record<string, string[]> = {}
  for (const error of errores) {
    const campo = prefijo ? `${prefijo}.${error.property}` : error.property
    if (error.constraints) resultado[campo] = Object.values(error.constraints)
    if (error.children?.length) Object.assign(resultado, aplanar(error.children, campo))
  }
  return resultado
}

/** Valida y transforma los DTO de entrada. Rechaza campos que no estén declarados en el DTO. */
export const tuberiaValidacion = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errores) => {
    const detalles = aplanar(errores)
    // Mensaje para los campos sobrantes, que class-validator entrega en inglés
    for (const [campo, mensajes] of Object.entries(detalles)) {
      detalles[campo] = mensajes.map((m) => (m.includes('should not exist') ? 'Este campo no está permitido.' : m))
    }
    return new BadRequestException({ mensaje: 'Revisa los datos enviados.', detalles })
  },
})
