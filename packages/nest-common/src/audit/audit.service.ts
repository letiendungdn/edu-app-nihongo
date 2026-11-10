import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export interface LogActionParams {
  userId: number | null;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  durationMs?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLogDocument>,
  ) {}

  async log(params: LogActionParams): Promise<void> {
    this.auditModel.create(params).catch(() => {});
  }

  async findByUser(userId: number, limit = 50) {
    return this.auditModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getStats(userId: number, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.auditModel.aggregate([
      { $match: { userId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          failCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}
