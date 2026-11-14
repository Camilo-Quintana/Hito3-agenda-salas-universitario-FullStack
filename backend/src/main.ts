import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { leerEntorno } from './config/entorno'
import { tuberiaValidacion } from './common/validacion'

async function iniciar() {
  // Las fechas y "ahora" se calculan con la hora de Chile, igual que en el frontend
  process.env.TZ ??= 'America/Santiago'
  const entorno = leerEntorno()

  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: entorno.origenesCors })
  app.useGlobalPipes(tuberiaValidacion)

  // Documentación interactiva en /api/docs (JSON del contrato en /api/docs-json)
  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('ReservaUNAB API')
      .setDescription(
        'API REST para gestionar espacios de la Sede Viña del Mar: edificios, espacios, equipamiento, ' +
          'reservas con aprobación, historial (MongoDB) e indicadores de utilización.\n\n' +
          'Para probar rutas protegidas: usa **POST /api/auth/login** y pega el token en **Authorize**.\n\n' +
          'Usuarios de prueba: admin@uandresbello.edu / Admin1234 · demo@uandresbello.edu / Demo1234',
      )
      .setVersion('2.0.0')
      .addBearerAuth()
      .build(),
  )
  SwaggerModule.setup('api/docs', app, documento, { swaggerOptions: { persistAuthorization: true } })

  await app.listen(entorno.puerto)
  Logger.log(`API lista en http://localhost:${entorno.puerto}/api · Swagger en /api/docs`, 'ReservaUNAB')
}

iniciar()
