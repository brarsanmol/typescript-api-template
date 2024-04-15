import { Container, attachControllers } from '@decorators/express'
import { json, urlencoded } from 'body-parser'
import express, { Application, Router } from 'express'
import { createConnection, Connection } from 'typeorm'
import winston, { Logger, createLogger } from 'winston'
import { Format } from 'logform'
import { errorLogger, logger } from 'express-winston'
import cors from 'cors'
import { config } from 'dotenv'

function useEnvironmentFile(): void {
  const { error } = config({
    path: `${__dirname}/../.env`,
  })

  if (error) throw error
}

function useCors(application: Application): void {
  application.use(
    cors({
      origin: [`${process.env.WEB_CLIENT_ADDRESS}`],
      credentials: true,
    })
  )
}

function useLogging(application: Application): void {
  const format: Format = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-D HH:MM:SS' }),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}] : ${message}`
    )
  )

  Container.provide([
    {
      provide: Logger,
      useValue: createLogger({
        format: format,
        transports: [new winston.transports.Console()],
      }),
    },
  ])

  application.use(
    logger({
      format: format,
      transports: [new winston.transports.Console()],
    }),
    errorLogger({
      format: format,
      transports: [new winston.transports.Console()],
    })
  )
}

async function useDatabase(): Promise<void> {
  Container.provide([
    {
      provide: Connection,
      useFactory: async () => createConnection(),
    },
  ])
}

async function useExpress(): Promise<Application> {
  const application: Application = express()
  const router: Router = Router()

  attachControllers(router, [])

  application.use(json(), urlencoded({ extended: false }))
  application.use('/api/v1', router)

  return application
}

function useControllers(application: Application): void {
  attachControllers(application, [])
}

;(async () => {
  const application: Application = await useExpress()

  useEnvironmentFile()
  useCors(application)
  useLogging(application)
  await useDatabase().catch(console.error)
  useControllers(application)

  application.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}.`)
  })
})()
