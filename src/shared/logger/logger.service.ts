import { Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import * as winston from 'winston';

export enum LogModule {
  AUTH = 'Auth',
  USERS = 'Users',
  CHAT = 'Chat',
  RELATIONSHIPS = 'Relationships',
  SYSTEM = 'System',
}

@Injectable()
export class AppLoggerService {
  private authLogger: winston.Logger;
  private usersLogger: winston.Logger;
  private chatLogger: winston.Logger;
  private relationshipsLogger: winston.Logger;
  private systemLogger: winston.Logger;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    // Create separate loggers for each module
    this.authLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'src/shared/logger/files/auth.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });

    this.usersLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'src/shared/logger/files/users.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });

    this.chatLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'src/shared/logger/files/chat.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });

    this.relationshipsLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'src/shared/logger/files/relationships.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });

    this.systemLogger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: 'src/shared/logger/files/system.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  logAuth(message: string, data?: unknown) {
    this.authLogger.info(
      JSON.stringify({ message, data, module: LogModule.AUTH }),
    );
    this.logger.log(
      JSON.stringify({ message, data, module: LogModule.AUTH }),
      LogModule.AUTH,
    );
  }

  logUsers(message: string, data?: unknown) {
    this.usersLogger.info(
      JSON.stringify({ message, data, module: LogModule.USERS }),
    );
    this.logger.log(
      JSON.stringify({ message, data, module: LogModule.USERS }),
      LogModule.USERS,
    );
  }

  logChat(message: string, data?: unknown) {
    this.chatLogger.info(
      JSON.stringify({ message, data, module: LogModule.CHAT }),
    );
    this.logger.log(
      JSON.stringify({ message, data, module: LogModule.CHAT }),
      LogModule.CHAT,
    );
  }

  logRelationships(message: string, data?: unknown) {
    this.relationshipsLogger.info(
      JSON.stringify({ message, data, module: LogModule.RELATIONSHIPS }),
    );
    this.logger.log(
      JSON.stringify({ message, data, module: LogModule.RELATIONSHIPS }),
      LogModule.RELATIONSHIPS,
    );
  }

  logSystem(message: string, data?: unknown) {
    this.systemLogger.info(
      JSON.stringify({ message, data, module: LogModule.SYSTEM }),
    );
    this.logger.log(
      JSON.stringify({ message, data, module: LogModule.SYSTEM }),
      LogModule.SYSTEM,
    );
  }

  logError(message: string, error?: unknown, context?: string) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      JSON.stringify({ message, error: errorMessage, context }),
      errorStack,
      context || 'System',
    );
  }

  logWarn(message: string, data?: unknown, context?: string) {
    this.logger.warn(JSON.stringify({ message, data }), context || 'System');
  }
}
