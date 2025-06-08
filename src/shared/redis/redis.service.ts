import { Injectable } from '@nestjs/common';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { OTPDto } from './otp.dto';

@Injectable()
export class RedisService {
  private keyv: Keyv;

  constructor(private readonly configService: ConfigService) {
    const redis = new KeyvRedis(this.configService.get<string>('REDIS_URL'));
    this.keyv = new Keyv({
      store: redis,
      namespace: '',
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.keyv.get(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.keyv.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    await this.keyv.delete(key);
  }

  async clear(): Promise<void> {
    await this.keyv.clear();
  }

  async setOtp(email: string, otp: string) {
    const key = this.buildKey('otp', email);
    const attempt = 0;
    await this.keyv.set(key, { otp, attempt }, 5 * 60 * 1000);
  }

  async getOtp(email: string): Promise<OTPDto | undefined> {
    return this.keyv.get(this.buildKey('otp', email));
  }

  private buildKey(domain: string, id: string | number): string {
    return `${domain}:${id}`;
  }
}
