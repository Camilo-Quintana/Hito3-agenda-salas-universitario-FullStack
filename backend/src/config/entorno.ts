// Lee y valida las variables de entorno al arrancar. Si falta algo obligatorio, la API no parte
// y el mensaje dice qué variable falta (sin mostrar valores).

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

// En desarrollo las variables vienen del archivo backend/.env; en Docker vienen de docker-compose.yml
// (no hay .env dentro del contenedor). Las variables que ya existen en el sistema tienen prioridad.
// La ruta sirve desde src/config (ts-node, pruebas) y desde dist/config (compilado).
const archivoEnv = resolve(__dirname, '../../.env')
if (existsSync(archivoEnv)) {
  for (const [clave, valor] of Object.entries(parseEnv(readFileSync(archivoEnv, 'utf8')))) {
    process.env[clave] ??= valor
  }
}

function obligatoria(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env (ver .env.example).`)
  return valor
}

export function leerEntorno() {
  return {
    puerto: Number(process.env.PORT ?? 3000),
    origenesCors: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
    postgres: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      puerto: Number(process.env.POSTGRES_PORT ?? 5432),
      usuario: obligatoria('POSTGRES_USER'),
      password: obligatoria('POSTGRES_PASSWORD'),
      baseDatos: obligatoria('POSTGRES_DB'),
    },
    mongoUri: obligatoria('MONGO_URI'),
    jwt: {
      secreto: obligatoria('JWT_SECRET'),
      expiraEn: process.env.JWT_EXPIRES_IN ?? '8h',
    },
  }
}

export type Entorno = ReturnType<typeof leerEntorno>
