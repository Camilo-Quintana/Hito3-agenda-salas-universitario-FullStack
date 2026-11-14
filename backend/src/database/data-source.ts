// Configuración de TypeORM que usan la API, las migraciones y el script de datos de prueba.
import 'reflect-metadata'
import '../config/entorno' // carga backend/.env antes de leer las variables
import { DataSource, DataSourceOptions } from 'typeorm'
import { Usuario } from '../usuarios/usuario.entity'
import { Edificio } from '../edificios/edificio.entity'
import { Equipamiento } from '../equipamiento/equipamiento.entity'
import { Espacio } from '../espacios/espacio.entity'
import { EspacioEquipamiento } from '../espacios/espacio-equipamiento.entity'
import { Reserva } from '../reservas/reserva.entity'
import { Inicial1762900000000 } from './migrations/1762900000000-Inicial'

export const ENTIDADES = [Usuario, Edificio, Equipamiento, Espacio, EspacioEquipamiento, Reserva]

export function opcionesPostgres(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: ENTIDADES,
    migrations: [Inicial1762900000000],
    // El esquema lo crean las migraciones, nunca "synchronize" (podría borrar datos)
    synchronize: false,
    migrationsRun: false,
  }
}

// Instancia que usa la CLI de TypeORM (npm run migration:run)
export default new DataSource(opcionesPostgres())
