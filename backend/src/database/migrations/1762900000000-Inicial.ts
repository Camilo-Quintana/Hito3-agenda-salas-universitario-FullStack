// Migración inicial: crea todas las tablas, tipos enum, claves, índices y restricciones del modelo.
// Generada con "typeorm migration:generate" a partir de las entidades y revisada a mano.
// Se aplica sola al levantar la API (seed.ts) o con: npm run migration:run
import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1762900000000 implements MigrationInterface {
    name = 'Inicial1762900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "edificios" ("id" SERIAL NOT NULL, "codigo" character varying(10) NOT NULL, "nombre" character varying(100) NOT NULL, "ubicacion" character varying(200), "pisos" smallint NOT NULL, CONSTRAINT "UQ_66aa3ff806591d2c04a370ef12b" UNIQUE ("codigo"), CONSTRAINT "ck_edificios_pisos" CHECK ("pisos" BETWEEN 1 AND 30), CONSTRAINT "PK_8e0aa89a1d90e60b4f88771934a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "equipamiento" ("id" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, CONSTRAINT "UQ_ae10c90096ad9dd98f10e5467eb" UNIQUE ("nombre"), CONSTRAINT "PK_5731bd51768cbf65ee08604fc54" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "espacio_equipamiento" ("espacio_id" integer NOT NULL, "equipamiento_id" integer NOT NULL, "cantidad" smallint NOT NULL DEFAULT '1', CONSTRAINT "ck_espacio_equipamiento_cantidad" CHECK ("cantidad" > 0), CONSTRAINT "PK_a3846851cdd079f2a7d1d22290a" PRIMARY KEY ("espacio_id", "equipamiento_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tipo_espacio" AS ENUM('Clases', 'Laboratorio', 'Reunión', 'Estudio', 'Exterior')`);
        await queryRunner.query(`CREATE TABLE "espacios" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "tipo" "public"."tipo_espacio" NOT NULL, "categoria" character varying(30), "piso" smallint NOT NULL, "capacidad" smallint NOT NULL, "requiere_aprobacion" boolean NOT NULL DEFAULT false, "activo" boolean NOT NULL DEFAULT true, "edificio_id" integer NOT NULL, CONSTRAINT "ck_espacios_piso" CHECK ("piso" >= 0), CONSTRAINT "ck_espacios_capacidad" CHECK ("capacidad" > 0), CONSTRAINT "PK_499dd7197047432e1058397e852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_espacios_edificio_nombre" ON "espacios" ("edificio_id", "nombre") `);
        await queryRunner.query(`CREATE TYPE "public"."estado_reserva" AS ENUM('pendiente', 'aprobada', 'rechazada', 'cancelada')`);
        await queryRunner.query(`CREATE TABLE "reservas" ("id" SERIAL NOT NULL, "usuario_id" integer NOT NULL, "espacio_id" integer NOT NULL, "fecha" date NOT NULL, "bloque" character varying(11) NOT NULL, "motivo" character varying(200) NOT NULL, "asistentes" smallint NOT NULL DEFAULT '1', "estado" "public"."estado_reserva" NOT NULL DEFAULT 'pendiente', "observacion" character varying(300), "revisada_por" integer, "creada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_reservas_bloque" CHECK ("bloque" ~ '^[0-2][0-9]:00-[0-2][0-9]:00$'), CONSTRAINT "ck_reservas_asistentes" CHECK ("asistentes" > 0), CONSTRAINT "PK_309c659053bcf5e56f8e40a2b42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_reservas_usuario_fecha_activa" ON "reservas" ("usuario_id", "fecha") WHERE "estado" IN ('pendiente', 'aprobada')`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_reservas_espacio_fecha_bloque_activa" ON "reservas" ("espacio_id", "fecha", "bloque") WHERE "estado" IN ('pendiente', 'aprobada')`);
        await queryRunner.query(`CREATE TYPE "public"."rol_usuario" AS ENUM('estudiante', 'admin')`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "rut" character varying(12) NOT NULL, "nombre" character varying(100) NOT NULL, "correo" character varying(120) NOT NULL, "password_hash" character varying(100) NOT NULL, "rol" "public"."rol_usuario" NOT NULL DEFAULT 'estudiante', "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9e90b993976dcd8bdabf4e3159d" UNIQUE ("rut"), CONSTRAINT "UQ_63665765c1a778a770c9bd585d3" UNIQUE ("correo"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "espacio_equipamiento" ADD CONSTRAINT "FK_7f1f88b98292843fa3db5a0c55a" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "espacio_equipamiento" ADD CONSTRAINT "FK_c2e3d8a199fcd8320edc65ea47c" FOREIGN KEY ("equipamiento_id") REFERENCES "equipamiento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "espacios" ADD CONSTRAINT "FK_7b53cc7033b3df7eab6a2062dde" FOREIGN KEY ("edificio_id") REFERENCES "edificios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservas" ADD CONSTRAINT "FK_9d105b4fd15dee6d606779680e2" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservas" ADD CONSTRAINT "FK_0d9718371759ac8e57bbe93944d" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservas" ADD CONSTRAINT "FK_438f65d955d93af309af51054a2" FOREIGN KEY ("revisada_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservas" DROP CONSTRAINT "FK_438f65d955d93af309af51054a2"`);
        await queryRunner.query(`ALTER TABLE "reservas" DROP CONSTRAINT "FK_0d9718371759ac8e57bbe93944d"`);
        await queryRunner.query(`ALTER TABLE "reservas" DROP CONSTRAINT "FK_9d105b4fd15dee6d606779680e2"`);
        await queryRunner.query(`ALTER TABLE "espacios" DROP CONSTRAINT "FK_7b53cc7033b3df7eab6a2062dde"`);
        await queryRunner.query(`ALTER TABLE "espacio_equipamiento" DROP CONSTRAINT "FK_c2e3d8a199fcd8320edc65ea47c"`);
        await queryRunner.query(`ALTER TABLE "espacio_equipamiento" DROP CONSTRAINT "FK_7f1f88b98292843fa3db5a0c55a"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TYPE "public"."rol_usuario"`);
        await queryRunner.query(`DROP INDEX "public"."uq_reservas_espacio_fecha_bloque_activa"`);
        await queryRunner.query(`DROP INDEX "public"."uq_reservas_usuario_fecha_activa"`);
        await queryRunner.query(`DROP TABLE "reservas"`);
        await queryRunner.query(`DROP TYPE "public"."estado_reserva"`);
        await queryRunner.query(`DROP INDEX "public"."uq_espacios_edificio_nombre"`);
        await queryRunner.query(`DROP TABLE "espacios"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_espacio"`);
        await queryRunner.query(`DROP TABLE "espacio_equipamiento"`);
        await queryRunner.query(`DROP TABLE "equipamiento"`);
        await queryRunner.query(`DROP TABLE "edificios"`);
    }

}
